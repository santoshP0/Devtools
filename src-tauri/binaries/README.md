# Bundled ffmpeg sidecars

These `ffmpeg-<target-triple>` binaries are **not committed** (git-ignored). They are
fetched at build time:

- **Locally:** `node scripts/fetch-ffmpeg.mjs` (downloads the binary for your OS/arch)
- **CI:** the `Bundle ffmpeg` steps in `.github/workflows/desktop-release.yml`

They are bundled into the desktop app as a Tauri sidecar (`bundle.externalBin` in
`tauri.conf.json`) so end users never install ffmpeg themselves.

## Sources (redistributable GPL — NOT nonfree)

- **macOS** (arm64 + x86_64, lipo'd universal): <https://ffmpeg.martin-riedl.de> — GPL v3
- **Windows / Linux**: <https://github.com/BtbN/FFmpeg-Builds> — GPL

We deliberately avoid `ffmpeg-static` (eugeneware): those macOS builds are
`--enable-nonfree`, which is **not legally redistributable**.

## Licensing obligations

These are **GPL** builds of FFmpeg. Shipping them means the desktop app distribution
must comply with the GPL: keep FFmpeg's license/notice available to users and make the
corresponding source available. FFmpeg source: <https://www.ffmpeg.org/download.html>.

# Screen Mirror binaries (adb + scrcpy server)

The Screen Mirror tool needs two more artifacts, also **not committed** and fetched at
build time via `node scripts/fetch-scrcpy.mjs`:

- **`adb-<target-triple>`** — Android Debug Bridge from Google platform-tools, bundled as
  a Tauri sidecar (`bundle.externalBin`). On Windows the accompanying `AdbWinApi.dll` /
  `AdbWinUsbApi.dll` are copied alongside it.
- **`scrcpy-server.jar`** — the on-device capture/control server from
  [Genymobile/scrcpy](https://github.com/Genymobile/scrcpy), pinned to the version in
  `scripts/fetch-scrcpy.mjs` (must match `SCRCPY_VERSION` in `src-tauri/src/mirror.rs`).
  Bundled as a Tauri resource (`bundle.resources`).

Both are **Apache-2.0** licensed — redistributable; keep their license/notice available
to users.
