use base64::Engine;
use image::{ImageFormat, ImageReader};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

// ── JSON High Performance Processing ───────────────────────────────────────

#[derive(Deserialize)]
pub struct JsonProcessReq {
  pub input: String,
  pub mode: String,     // "format", "minify", "validate"
  pub indent: u32,      // 2, 4, etc.
  pub use_tabs: bool,
}

#[derive(Serialize)]
pub struct JsonErrorDetail {
  pub message: String,
  pub line: usize,
  pub column: usize,
}

#[derive(Serialize)]
pub struct JsonProcessRes {
  pub ok: bool,
  pub output: String,
  pub in_bytes: usize,
  pub out_bytes: usize,
  pub time_us: u128,
  pub keys_count: usize,
  pub depth: usize,
  pub error: Option<JsonErrorDetail>,
}

fn count_keys_and_depth(v: &serde_json::Value, current_depth: usize) -> (usize, usize) {
  match v {
    serde_json::Value::Object(map) => {
      let mut keys = map.len();
      let mut max_d = current_depth + 1;
      for val in map.values() {
        let (k, d) = count_keys_and_depth(val, current_depth + 1);
        keys += k;
        if d > max_d {
          max_d = d;
        }
      }
      (keys, max_d)
    }
    serde_json::Value::Array(arr) => {
      let mut keys = 0;
      let mut max_d = current_depth + 1;
      for val in arr {
        let (k, d) = count_keys_and_depth(val, current_depth + 1);
        keys += k;
        if d > max_d {
          max_d = d;
        }
      }
      (keys, max_d)
    }
    _ => (0, current_depth),
  }
}

#[tauri::command]
pub async fn json_process(req: JsonProcessReq) -> Result<JsonProcessRes, String> {
  let t0 = std::time::Instant::now();
  let in_bytes = req.input.len();

  tauri::async_runtime::spawn_blocking(move || {
    let parse_res: Result<serde_json::Value, serde_json::Error> = serde_json::from_str(&req.input);

    match parse_res {
      Ok(val) => {
        let (keys_count, depth) = if in_bytes < 300_000 {
          count_keys_and_depth(&val, 1)
        } else {
          match &val {
            serde_json::Value::Object(m) => (m.len(), 2),
            serde_json::Value::Array(a) => (a.len(), 2),
            _ => (0, 1),
          }
        };
        let out = if req.mode == "validate" {
          "✓ Valid JSON".to_string()
        } else if req.mode == "minify" {
          serde_json::to_string(&val).unwrap_or_default()
        } else {
          // format
          let indent_bytes = if req.use_tabs {
            b"\t".to_vec()
          } else {
            vec![b' '; req.indent.clamp(1, 8) as usize]
          };
          let formatter = serde_json::ser::PrettyFormatter::with_indent(&indent_bytes);
          let mut writer = Vec::with_capacity(in_bytes * 2);
          let mut ser = serde_json::Serializer::with_formatter(&mut writer, formatter);
          if let Err(e) = val.serialize(&mut ser) {
            return Err(e.to_string());
          }
          String::from_utf8(writer).map_err(|e| e.to_string())?
        };

        let out_bytes = out.len();
        let elapsed = t0.elapsed().as_micros();

        Ok(JsonProcessRes {
          ok: true,
          output: out,
          in_bytes,
          out_bytes,
          time_us: elapsed,
          keys_count,
          depth,
          error: None,
        })
      }
      Err(e) => {
        let elapsed = t0.elapsed().as_micros();
        Ok(JsonProcessRes {
          ok: false,
          output: String::new(),
          in_bytes,
          out_bytes: 0,
          time_us: elapsed,
          keys_count: 0,
          depth: 0,
          error: Some(JsonErrorDetail {
            message: e.to_string(),
            line: e.line(),
            column: e.column(),
          }),
        })
      }
    }
  })
  .await
  .map_err(|e| e.to_string())?
}

// ── Regex High Performance Execution ───────────────────────────────────────

#[derive(Deserialize)]
pub struct RegexReq {
  pub pattern: String,
  pub flags: String, // "i", "m", "s", "g"
  pub text: String,
  pub replace: Option<String>,
  pub max_matches: Option<usize>,
}

#[derive(Serialize)]
pub struct RegexMatch {
  pub start: usize,
  pub end: usize,
  pub text: String,
  pub line: usize,
  pub col: usize,
  pub captures: Vec<Option<String>>,
}

#[derive(Serialize)]
pub struct RegexRes {
  pub ok: bool,
  pub matches: Vec<RegexMatch>,
  pub total_matches: usize,
  pub replaced: Option<String>,
  pub time_us: u128,
  pub error: Option<String>,
}

#[tauri::command]
pub async fn regex_execute(req: RegexReq) -> Result<RegexRes, String> {
  let t0 = std::time::Instant::now();

  tauri::async_runtime::spawn_blocking(move || {
    let mut builder = regex::RegexBuilder::new(&req.pattern);
    builder.case_insensitive(req.flags.contains('i'));
    builder.multi_line(req.flags.contains('m'));
    builder.dot_matches_new_line(req.flags.contains('s'));

    let re = match builder.build() {
      Ok(r) => r,
      Err(e) => {
        return Ok(RegexRes {
          ok: false,
          matches: Vec::new(),
          total_matches: 0,
          replaced: None,
          time_us: t0.elapsed().as_micros(),
          error: Some(e.to_string()),
        });
      }
    };

    let line_starts: Vec<usize> = std::iter::once(0)
      .chain(req.text.match_indices('\n').map(|(i, _)| i + 1))
      .collect();

    let get_line_col = |pos: usize| -> (usize, usize) {
      match line_starts.binary_search(&pos) {
        Ok(idx) => (idx + 1, 1),
        Err(idx) => {
          let line = idx;
          let col = pos - line_starts[line - 1] + 1;
          (line, col)
        }
      }
    };

    let limit = req.max_matches.unwrap_or(2000);
    let mut matches = Vec::new();
    let mut total_matches = 0;
    let is_global = req.flags.contains('g');

    for m in re.find_iter(&req.text) {
      total_matches += 1;
      if matches.len() < limit {
        let (line, col) = get_line_col(m.start());
        
        let captures = if let Some(caps) = re.captures(&req.text[m.start()..m.end()]) {
          caps.iter().skip(1).map(|c| c.map(|sub| sub.as_str().to_string())).collect()
        } else {
          Vec::new()
        };

        matches.push(RegexMatch {
          start: m.start(),
          end: m.end(),
          text: m.as_str().to_string(),
          line,
          col,
          captures,
        });
      }
      if !is_global {
        break;
      }
    }

    let replaced = req.replace.map(|rep| {
      if is_global {
        re.replace_all(&req.text, rep.as_str()).into_owned()
      } else {
        re.replace(&req.text, rep.as_str()).into_owned()
      }
    });

    let elapsed = t0.elapsed().as_micros();

    Ok(RegexRes {
      ok: true,
      matches,
      total_matches,
      replaced,
      time_us: elapsed,
      error: None,
    })
  })
  .await
  .map_err(|e| e.to_string())?
}

// ── Unified Diff Generator ─────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct DiffReq {
  pub original: String,
  pub modified: String,
  pub name_a: Option<String>,
  pub name_b: Option<String>,
}

#[derive(Deserialize)]
pub struct DiffFilesReq {
  pub path_a: String,
  pub path_b: String,
}

#[derive(Serialize)]
pub struct DiffRes {
  pub patch: String,
  pub additions: usize,
  pub deletions: usize,
  pub unchanged: usize,
  pub time_us: u128,
}

fn compute_diff_core(
  original: &str,
  modified: &str,
  name_a: &str,
  name_b: &str,
  t0: std::time::Instant,
) -> Result<DiffRes, String> {
  let lines_a: Vec<&str> = original.lines().collect();
  let lines_b: Vec<&str> = modified.lines().collect();

  let n = lines_a.len();
  let m = lines_b.len();

  if lines_a == lines_b {
    return Ok(DiffRes {
      patch: format!("--- a/{name_a}\n+++ b/{name_b}\n"),
      additions: 0,
      deletions: 0,
      unchanged: n,
      time_us: t0.elapsed().as_micros(),
    });
  }

  // Cap dynamic programming matrix to 4 million elements (e.g. 2000 x 2000)
  // to guarantee strict flat memory (<16MB) and prevent OOM
  if n * m <= 4_000_000 {
    let mut dp = vec![vec![0u32; m + 1]; n + 1];
    for i in 0..n {
      for j in 0..m {
        if lines_a[i] == lines_b[j] {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = dp[i][j].max(dp[i][j + 1]);
        }
      }
    }

    let mut edits = Vec::new();
    let mut i = n;
    let mut j = m;
    let mut additions = 0;
    let mut deletions = 0;
    let mut unchanged = 0;

    while i > 0 || j > 0 {
      if i > 0 && j > 0 && lines_a[i - 1] == lines_b[j - 1] {
        edits.push((' ', lines_a[i - 1]));
        unchanged += 1;
        i -= 1;
        j -= 1;
      } else if j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j]) {
        edits.push(('+', lines_b[j - 1]));
        additions += 1;
        j -= 1;
      } else if i > 0 && (j == 0 || dp[i][j - 1] < dp[i - 1][j]) {
        edits.push(('-', lines_a[i - 1]));
        deletions += 1;
        i -= 1;
      }
    }
    edits.reverse();

    let mut patch = format!("--- a/{name_a}\n+++ b/{name_b}\n@@ -1,{n} +1,{m} @@\n");
    for (tag, line) in edits {
      patch.push(tag);
      patch.push_str(line);
      patch.push('\n');
    }

    Ok(DiffRes {
      patch,
      additions,
      deletions,
      unchanged,
      time_us: t0.elapsed().as_micros(),
    })
  } else {
    // For large files (>2000 lines), use fast linear prefix/suffix trimming
    let mut prefix = 0;
    while prefix < n && prefix < m && lines_a[prefix] == lines_b[prefix] {
      prefix += 1;
    }
    let mut suffix = 0;
    while suffix < (n - prefix) && suffix < (m - prefix) && lines_a[n - 1 - suffix] == lines_b[m - 1 - suffix] {
      suffix += 1;
    }

    let mut patch = format!("--- a/{name_a}\n+++ b/{name_b}\n@@ -1,{n} +1,{m} @@\n");
    let mut additions = 0;
    let mut deletions = 0;
    let unchanged = prefix + suffix;

    for &line in &lines_a[..prefix] {
      patch.push(' ');
      patch.push_str(line);
      patch.push('\n');
    }

    for &line in &lines_a[prefix..(n - suffix)] {
      patch.push('-');
      patch.push_str(line);
      patch.push('\n');
      deletions += 1;
    }

    for &line in &lines_b[prefix..(m - suffix)] {
      patch.push('+');
      patch.push_str(line);
      patch.push('\n');
      additions += 1;
    }

    for &line in &lines_a[(n - suffix)..] {
      patch.push(' ');
      patch.push_str(line);
      patch.push('\n');
    }

    Ok(DiffRes {
      patch,
      additions,
      deletions,
      unchanged,
      time_us: t0.elapsed().as_micros(),
    })
  }
}

#[tauri::command]
pub async fn generate_patch(req: DiffReq) -> Result<DiffRes, String> {
  let t0 = std::time::Instant::now();
  tauri::async_runtime::spawn_blocking(move || {
    let name_a = req.name_a.as_deref().unwrap_or("original.txt");
    let name_b = req.name_b.as_deref().unwrap_or("modified.txt");
    compute_diff_core(&req.original, &req.modified, name_a, name_b, t0)
  })
  .await
  .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn diff_files(req: DiffFilesReq) -> Result<DiffRes, String> {
  let t0 = std::time::Instant::now();
  tauri::async_runtime::spawn_blocking(move || {
    let content_a = std::fs::read_to_string(&req.path_a)
      .map_err(|e| format!("Failed to read {}: {}", req.path_a, e))?;
    let content_b = std::fs::read_to_string(&req.path_b)
      .map_err(|e| format!("Failed to read {}: {}", req.path_b, e))?;

    let name_a = std::path::Path::new(&req.path_a)
      .file_name()
      .and_then(|n| n.to_str())
      .unwrap_or("original.txt");
    let name_b = std::path::Path::new(&req.path_b)
      .file_name()
      .and_then(|n| n.to_str())
      .unwrap_or("modified.txt");

    compute_diff_core(&content_a, &content_b, name_a, name_b, t0)
  })
  .await
  .map_err(|e| e.to_string())?
}

// ── CSV Fast Native Parser & Converter ──────────────────────────────────────

#[derive(Deserialize)]
pub struct CsvParseReq {
  pub text: Option<String>,
  pub path: Option<String>,
  pub max_rows: Option<usize>,
}

#[derive(Serialize)]
pub struct CsvParseRes {
  pub headers: Vec<String>,
  pub rows: Vec<Vec<String>>,
  pub total_rows: usize,
  pub time_us: u128,
}

fn parse_csv_line(line: &str) -> Vec<String> {
  let mut vals = Vec::new();
  let mut cur = String::new();
  let mut in_q = false;
  let mut chars = line.chars().peekable();

  while let Some(c) = chars.next() {
    if c == '"' {
      if in_q && chars.peek() == Some(&'"') {
        cur.push('"');
        chars.next();
      } else {
        in_q = !in_q;
      }
    } else if c == ',' && !in_q {
      vals.push(cur.trim().to_string());
      cur.clear();
    } else {
      cur.push(c);
    }
  }
  vals.push(cur.trim().to_string());
  vals
}

#[tauri::command]
pub async fn csv_parse(req: CsvParseReq) -> Result<CsvParseRes, String> {
  let t0 = std::time::Instant::now();
  tauri::async_runtime::spawn_blocking(move || {
    let raw = if let Some(path) = req.path {
      std::fs::read_to_string(&path).map_err(|e| format!("Cannot read CSV file: {e}"))?
    } else if let Some(txt) = req.text {
      txt
    } else {
      return Err("Either text or path must be provided".to_string());
    };

    let mut lines = raw.lines().filter(|l| !l.trim().is_empty());
    let header_line = match lines.next() {
      Some(h) => h,
      None => {
        return Ok(CsvParseRes {
          headers: Vec::new(),
          rows: Vec::new(),
          total_rows: 0,
          time_us: t0.elapsed().as_micros(),
        })
      }
    };

    let headers = parse_csv_line(header_line);
    let limit = req.max_rows.unwrap_or(usize::MAX);
    let mut rows = Vec::new();
    let mut total_rows = 0;

    for line in lines {
      total_rows += 1;
      if rows.len() < limit {
        rows.push(parse_csv_line(line));
      }
    }

    Ok(CsvParseRes {
      headers,
      rows,
      total_rows,
      time_us: t0.elapsed().as_micros(),
    })
  })
  .await
  .map_err(|e| e.to_string())?
}

#[derive(Deserialize)]
pub struct CsvConvReq {
  pub data: String,
}

#[derive(Serialize)]
pub struct CsvConvRes {
  pub ok: bool,
  pub output: String,
  pub time_us: u128,
  pub error: Option<String>,
}

#[tauri::command]
pub async fn csv_to_json(req: CsvConvReq) -> Result<CsvConvRes, String> {
  let t0 = std::time::Instant::now();
  tauri::async_runtime::spawn_blocking(move || {
    let mut lines = req.data.lines().filter(|l| !l.trim().is_empty());
    let header_line = match lines.next() {
      Some(h) => h,
      None => {
        return Ok(CsvConvRes {
          ok: false,
          output: String::new(),
          time_us: t0.elapsed().as_micros(),
          error: Some("Need at least a header row and one data row".to_string()),
        })
      }
    };

    let headers = parse_csv_line(header_line);
    let mut json_rows = Vec::new();

    for line in lines {
      let vals = parse_csv_line(line);
      let mut obj = serde_json::Map::new();
      for (i, h) in headers.iter().enumerate() {
        let val = vals.get(i).map(|s| s.as_str()).unwrap_or("");
        obj.insert(h.clone(), serde_json::Value::String(val.to_string()));
      }
      json_rows.push(serde_json::Value::Object(obj));
    }

    let out = serde_json::to_string_pretty(&json_rows).unwrap_or_default();
    Ok(CsvConvRes {
      ok: true,
      output: out,
      time_us: t0.elapsed().as_micros(),
      error: None,
    })
  })
  .await
  .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn json_to_csv(req: CsvConvReq) -> Result<CsvConvRes, String> {
  let t0 = std::time::Instant::now();
  tauri::async_runtime::spawn_blocking(move || {
    let parsed: serde_json::Value = match serde_json::from_str(&req.data) {
      Ok(v) => v,
      Err(e) => {
        return Ok(CsvConvRes {
          ok: false,
          output: String::new(),
          time_us: t0.elapsed().as_micros(),
          error: Some(format!("Invalid JSON: {e}")),
        })
      }
    };

    let arr = match parsed.as_array() {
      Some(a) if !a.is_empty() => a,
      _ => {
        return Ok(CsvConvRes {
          ok: false,
          output: String::new(),
          time_us: t0.elapsed().as_micros(),
          error: Some("JSON must be a non-empty array of objects".to_string()),
        })
      }
    };

    let mut headers: Vec<String> = Vec::new();
    if let Some(first) = arr.first().and_then(|v| v.as_object()) {
      headers = first.keys().cloned().collect();
    }

    let escape_csv = |s: &str| -> String {
      if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
      } else {
        s.to_string()
      }
    };

    let mut csv_out = headers.iter().map(|h| escape_csv(h)).collect::<Vec<_>>().join(",");
    csv_out.push('\n');

    for item in arr {
      if let Some(obj) = item.as_object() {
        let row: Vec<String> = headers
          .iter()
          .map(|h| {
            let val = match obj.get(h) {
              Some(serde_json::Value::String(s)) => escape_csv(s),
              Some(serde_json::Value::Null) | None => String::new(),
              Some(other) => escape_csv(&other.to_string()),
            };
            val
          })
          .collect();
        csv_out.push_str(&row.join(","));
        csv_out.push('\n');
      }
    }

    Ok(CsvConvRes {
      ok: true,
      output: csv_out,
      time_us: t0.elapsed().as_micros(),
      error: None,
    })
  })
  .await
  .map_err(|e| e.to_string())?
}

// ── Dark/Light Converter Native Image Pixel Engine ──────────────────────────

#[derive(Deserialize)]
pub struct DarkLightReq {
  pub bytes: Vec<u8>,
  pub mode: String,          // "smart", "highcontrast", "invert"
  pub format: String,        // "png", "jpeg", "webp"
  #[allow(dead_code)]
  pub quality: Option<u8>,
}

#[derive(Serialize)]
pub struct DarkLightRes {
  pub ok: bool,
  pub data: String, // base64 Data URL
  pub width: u32,
  pub height: u32,
  pub time_us: u128,
  pub error: Option<String>,
}

fn rgb_to_hsl(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
  let r = r / 255.0;
  let g = g / 255.0;
  let b = b / 255.0;
  let max = r.max(g).max(b);
  let min = r.min(g).min(b);
  let l = (max + min) / 2.0;

  if (max - min).abs() < 1e-5 {
    return (0.0, 0.0, l);
  }

  let d = max - min;
  let s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };
  let mut h = if max == r {
    (g - b) / d + (if g < b { 6.0 } else { 0.0 })
  } else if max == g {
    (b - r) / d + 2.0
  } else {
    (r - g) / d + 4.0
  };
  h /= 6.0;

  (h, s, l)
}

fn hue_to_rgb(p: f32, q: f32, mut t: f32) -> f32 {
  if t < 0.0 { t += 1.0; }
  if t > 1.0 { t -= 1.0; }
  if t < 1.0 / 6.0 { return p + (q - p) * 6.0 * t; }
  if t < 1.0 / 2.0 { return q; }
  if t < 2.0 / 3.0 { return p + (q - p) * (2.0 / 3.0 - t) * 6.0; }
  p
}

fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (u8, u8, u8) {
  if s.abs() < 1e-5 {
    let v = (l * 255.0).round().clamp(0.0, 255.0) as u8;
    return (v, v, v);
  }

  let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
  let p = 2.0 * l - q;

  let r = (hue_to_rgb(p, q, h + 1.0 / 3.0) * 255.0).round().clamp(0.0, 255.0) as u8;
  let g = (hue_to_rgb(p, q, h) * 255.0).round().clamp(0.0, 255.0) as u8;
  let b = (hue_to_rgb(p, q, h - 1.0 / 3.0) * 255.0).round().clamp(0.0, 255.0) as u8;

  (r, g, b)
}

#[tauri::command]
pub async fn convert_dark_light(req: DarkLightReq) -> Result<DarkLightRes, String> {
  let t0 = std::time::Instant::now();
  tauri::async_runtime::spawn_blocking(move || {
    let img = match ImageReader::new(Cursor::new(&req.bytes)).with_guessed_format() {
      Ok(reader) => match reader.decode() {
        Ok(decoded) => decoded,
        Err(e) => {
          return Ok(DarkLightRes {
            ok: false,
            data: String::new(),
            width: 0,
            height: 0,
            time_us: t0.elapsed().as_micros(),
            error: Some(format!("Could not decode image: {e}")),
          })
        }
      },
      Err(e) => {
        return Ok(DarkLightRes {
          ok: false,
          data: String::new(),
          width: 0,
          height: 0,
          time_us: t0.elapsed().as_micros(),
          error: Some(format!("Invalid image format: {e}")),
        })
      }
    };

    let mut rgba = img.to_rgba8();
    let (width, height) = (rgba.width(), rgba.height());
    let is_invert = req.mode == "invert";
    let is_highcontrast = req.mode == "highcontrast";

    for pixel in rgba.pixels_mut() {
      if pixel[3] == 0 {
        continue;
      }
      if is_invert {
        pixel[0] = 255 - pixel[0];
        pixel[1] = 255 - pixel[1];
        pixel[2] = 255 - pixel[2];
      } else {
        let (h, s, l) = rgb_to_hsl(pixel[0] as f32, pixel[1] as f32, pixel[2] as f32);
        let mut new_l = 1.0 - l;
        if is_highcontrast {
          new_l = if new_l < 0.5 { new_l * 0.8 } else { 1.0 - (1.0 - new_l) * 0.8 };
        }
        let (nr, ng, nb) = hsl_to_rgb(h, s, new_l);
        pixel[0] = nr;
        pixel[1] = ng;
        pixel[2] = nb;
      }
    }

    let mut out_bytes = Vec::new();
    let (fmt, mime) = match req.format.as_str() {
      "jpeg" | "jpg" => (ImageFormat::Jpeg, "image/jpeg"),
      "webp" => (ImageFormat::WebP, "image/webp"),
      _ => (ImageFormat::Png, "image/png"),
    };

    if let Err(e) = rgba.write_to(&mut Cursor::new(&mut out_bytes), fmt) {
      return Ok(DarkLightRes {
        ok: false,
        data: String::new(),
        width,
        height,
        time_us: t0.elapsed().as_micros(),
        error: Some(format!("Failed to encode image: {e}")),
      });
    }

    let b64 = base64::engine::general_purpose::STANDARD.encode(&out_bytes);
    let data_url = format!("data:{mime};base64,{b64}");

    Ok(DarkLightRes {
      ok: true,
      data: data_url,
      width,
      height,
      time_us: t0.elapsed().as_micros(),
      error: None,
    })
  })
  .await
  .map_err(|e| e.to_string())?
}
