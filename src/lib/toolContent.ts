// Long-form content rendered below each tool. Gives every page real,
// distinct text instead of a bare widget — better for readers, for search,
// and for ad network content reviews. Tools with no entry render nothing.

export interface ToolContent {
  about: string[]
  faq?: { q: string; a: string }[]
}

const PRIVACY_A =
  'No. Everything runs locally in your browser using JavaScript — nothing you paste or open is uploaded to a server. You can confirm it by opening your browser devtools Network tab, or by disconnecting from the internet and using the tool offline.'

export const toolContent: Record<string, ToolContent> = {
  'json-formatter': {
    about: [
      'JSON is easy for machines to read and painful for humans when it arrives minified on a single line. This formatter re-indents that output into a readable tree, validates it as you type, and points at the exact line and column when something is wrong — a stray trailing comma, a single quote where JSON demands double quotes, or an unclosed bracket.',
      'It is most useful when you are debugging an API response, cleaning up a config file, or trying to understand a payload someone pasted into a ticket. You can also minify in the other direction to strip whitespace before shipping a fixture or embedding JSON in an environment variable.',
    ],
    faq: [
      { q: 'Is my JSON sent anywhere?', a: PRIVACY_A },
      { q: 'Why does it say "Unexpected token" on valid-looking JSON?', a: 'Usually a trailing comma after the last item, single quotes instead of double quotes, or unquoted keys. Those are legal in JavaScript objects but not in JSON. The error message points at the exact line so you can jump straight to it.' },
      { q: 'Can it handle large files?', a: 'Yes — parsing happens in your browser, so the practical limit is your machine\'s memory rather than an upload cap. Multi-megabyte files are fine; very large ones may take a moment to re-render.' },
    ],
  },

  'regex-tester': {
    about: [
      'Regular expressions are quick to write and slow to verify. This tester runs your pattern against sample text live and highlights every match as you type, so you can see immediately whether a quantifier is greedy, whether an anchor is doing what you expected, or why a capture group came back empty.',
      'It is built for the tightening loop: paste a few real lines from a log or CSV, sketch a rough pattern, then adjust until only the intended text lights up. Because matching happens in the browser with the same engine your JavaScript will use, what you see here is what your code will do.',
    ],
    faq: [
      { q: 'Which regex flavour does it use?', a: 'JavaScript (ECMAScript) regular expressions, the same engine as your browser and Node. Syntax from other languages — such as Python\'s named groups in the (?P<name>…) form or PCRE recursion — may not work identically.' },
      { q: 'What do the flags mean?', a: 'g finds all matches rather than stopping at the first, i ignores case, m makes ^ and $ match at line breaks, and s lets . match newlines too.' },
      { q: 'Is my test data private?', a: PRIVACY_A },
    ],
  },

  'base64': {
    about: [
      'Base64 encodes binary data using only 64 safe ASCII characters, which makes it possible to move images, keys, or arbitrary bytes through channels that only accept text — JSON payloads, HTTP headers, email bodies, or a YAML config. This tool converts in both directions, for text and for files.',
      'A common use is embedding a small image directly in CSS or HTML as a data URI to avoid an extra network request, or decoding the middle segment of a JWT to inspect its claims. Note that Base64 is an encoding, not encryption — anyone can decode it, so never use it to hide secrets.',
    ],
    faq: [
      { q: 'Is Base64 secure?', a: 'No. It is trivially reversible and provides zero confidentiality. It exists to make binary data survive text-only transport, not to protect it. Use real encryption for secrets.' },
      { q: 'Why did my encoded string get bigger?', a: 'Base64 represents every 3 bytes as 4 characters, so output is about 33% larger than the input. That overhead is the cost of text safety.' },
      { q: 'What are the trailing = signs?', a: 'Padding. They keep the output length a multiple of four when the input length is not divisible by three. Some decoders accept the string without them.' },
    ],
  },

  'diff-checker': {
    about: [
      'Comparing two versions of a file by eye is unreliable, especially when the change is a single character. This diff checker aligns both texts and marks exactly what was added, removed, or left alone, with a side-by-side view for structural changes and a unified view for reading like a patch.',
      'It is handy well outside of code: comparing two config files across environments, checking what a colleague edited in a document, spotting an unexpected difference between two API responses, or confirming that a generated file matches the one you committed.',
    ],
    faq: [
      { q: 'Does it work on very long files?', a: 'Yes. Comparison runs in your browser and the panes scroll internally, so long files stay manageable without the whole page growing.' },
      { q: 'Can I compare JSON or code?', a: 'Yes — paste either side as plain text. For JSON, formatting both sides first (with the JSON Formatter) makes the diff far easier to read, because minified JSON collapses into one enormous line.' },
      { q: 'Are my files uploaded?', a: PRIVACY_A },
    ],
  },

  'unix-timestamp': {
    about: [
      'A Unix timestamp counts the seconds elapsed since 1 January 1970 UTC. It is compact and unambiguous, which is why databases and APIs love it and humans cannot read it. This converter turns a timestamp into a readable date and time, and converts a date back into a timestamp.',
      'It is the fastest way to answer questions like "when did this log entry actually happen" or "what value do I put in this expiry field". Both seconds and milliseconds are handled, which matters because JavaScript uses milliseconds while most backends use seconds — a mismatch that produces dates in 1970 or the year 55000.',
    ],
    faq: [
      { q: 'Seconds or milliseconds?', a: 'A 10-digit number is normally seconds; a 13-digit number is milliseconds. JavaScript\'s Date.now() returns milliseconds, while Unix tooling and most APIs use seconds.' },
      { q: 'Why does my date look wrong by a few hours?', a: 'Almost always a timezone difference. Timestamps are absolute UTC values; the readable date is rendered in a specific zone. Check whether you are comparing UTC against local time.' },
      { q: 'What is the 2038 problem?', a: 'Systems storing timestamps in a signed 32-bit integer overflow in January 2038. Modern systems use 64-bit values, which pushes the limit far beyond any practical concern.' },
    ],
  },

  'jwt-decoder': {
    about: [
      'A JSON Web Token is three Base64url segments separated by dots: a header describing the algorithm, a payload of claims, and a signature. This decoder splits the token and shows the header and payload as readable JSON so you can inspect who issued it, who it is for, and when it expires.',
      'That makes it useful when debugging authentication — checking whether the exp claim has already passed, whether the audience matches the API you are calling, or whether a role or scope you expected is actually present in the token your client is sending.',
    ],
    faq: [
      { q: 'Does this verify the signature?', a: 'No — it decodes and displays the contents. Verifying a signature requires the issuer\'s secret or public key, and you should never paste a production signing key into any website.' },
      { q: 'Is it safe to paste a token here?', a: 'Decoding happens entirely in your browser and nothing is transmitted. Still, treat a live token like a password: it grants access until it expires, so avoid pasting production tokens into any tool you have not verified.' },
      { q: 'Why is the payload readable without a key?', a: 'JWT payloads are only Base64url-encoded, not encrypted. Anyone holding the token can read the claims. The signature proves the token was not altered; it does not hide it.' },
    ],
  },

  'color-converter': {
    about: [
      'Design tools, CSS, and image editors all describe the same colour differently. This converter moves a single colour between HEX, RGB, HSL, and OKLCH at once, so you can copy whichever format the file in front of you expects without doing the arithmetic yourself.',
      'HSL is easier to reason about when you want a lighter or more muted variant of an existing colour, since you adjust one number instead of three. OKLCH goes further: it is perceptually uniform, so equal changes in lightness look equally different to the eye — useful when building a colour scale that stays visually even.',
    ],
    faq: [
      { q: 'What is OKLCH and should I use it?', a: 'OKLCH describes colour as lightness, chroma, and hue in a space matched to human perception. It is supported in all current browsers and is excellent for generating palettes where each step looks evenly spaced. Keep a HEX fallback if you must support very old browsers.' },
      { q: 'Why do my HEX and HSL values not round-trip exactly?', a: 'HEX has 8 bits per channel while HSL uses percentages, so converting between them rounds. The visible difference is nil, but the numbers may shift by one.' },
      { q: 'Does it support transparency?', a: 'Alpha is preserved where the target format supports it, such as 8-digit HEX and the rgb()/hsl() forms with an alpha component.' },
    ],
  },

  'url-encoder': {
    about: [
      'URLs may only contain a limited set of characters, so anything else — spaces, ampersands, slashes, accented letters, emoji — has to be percent-encoded. This tool encodes and decodes those values so a query string survives the trip intact instead of being cut short at the first unexpected character.',
      'It matters most when building query parameters by hand or debugging a redirect that loses part of its payload. A raw & inside a parameter value silently starts a new parameter; encoding it as %26 keeps it as data. Decoding is equally useful for reading an unreadable URL from a log.',
    ],
    faq: [
      { q: 'What is the difference between encoding a component and a full URL?', a: 'Encoding a component escapes characters like / ? : @ & = because they are data inside a value. Encoding a whole URL leaves those intact because they are structural. Use component encoding for individual parameter values.' },
      { q: 'Why do I sometimes see + instead of %20 for a space?', a: 'HTML form submissions use the application/x-www-form-urlencoded format, which encodes a space as +. Elsewhere in a URL a space becomes %20. Both decode back to a space in the right context.' },
      { q: 'Is my data sent anywhere?', a: PRIVACY_A },
    ],
  },

  'image-compressor': {
    about: [
      'Large images are usually the heaviest thing on a web page, and most of that weight is invisible to the viewer. This compressor re-encodes your images at a quality level you choose and can scale them down to a sensible maximum dimension, which is frequently where the biggest saving comes from — a 4000px photo displayed in a 800px column is carrying four times the pixels it needs.',
      'Compression runs entirely in your browser, so you can safely process client photos, screenshots containing internal data, or anything else you would rather not upload. Batch several files at once and download them individually or together.',
    ],
    faq: [
      { q: 'What quality setting should I use?', a: 'Around 75–85% is the usual sweet spot for photographs: a large size reduction with no difference most people can see. Drop lower for background images, go higher for detailed graphics or anything with text.' },
      { q: 'Are my images uploaded?', a: PRIVACY_A },
      { q: 'Why did my PNG barely shrink?', a: 'PNG is lossless and already efficient for flat graphics and screenshots. For photographs, converting to JPEG or WebP will save far more than compressing the PNG. The Image Converter handles that.' },
    ],
  },

  'image-converter': {
    about: [
      'Different formats are good at different things: JPEG for photographs, PNG for flat graphics and transparency, WebP for smaller files that every current browser understands. This converter moves an image between them, with quality and resize controls so you can trade file size against fidelity deliberately.',
      'It also reads HEIC and HEIF, the format iPhones use by default. Those files are small and high quality but awkward to share, because many websites, Windows applications, and older tools cannot open them. Converting a HEIC to JPEG or PNG makes an iPhone photo usable anywhere.',
    ],
    faq: [
      { q: 'Why will my iPhone photo not open on other sites?', a: 'iPhones save as HEIC, which most browsers cannot decode and many upload forms reject. Convert it to JPEG for maximum compatibility, or WebP for a smaller file that modern browsers handle.' },
      { q: 'Which format should I pick?', a: 'JPEG for photographs where you do not need transparency, PNG for logos, icons, screenshots, and anything with sharp edges or transparency, WebP when you want the smallest file and only need current browsers.' },
      { q: 'Will converting reduce quality?', a: 'Converting to JPEG or WebP is lossy, so some information is discarded — usually invisible at high quality settings. Converting to PNG is lossless, but the file will often be much larger.' },
    ],
  },

  'hash-generator': {
    about: [
      'A cryptographic hash turns any input into a fixed-length fingerprint. The same input always produces the same hash, and changing a single character produces a completely different one, which makes hashes ideal for verifying that a file or message arrived exactly as it left.',
      'The everyday use is integrity checking: comparing the SHA-256 published next to a download against the one you compute locally. Hashes are also the basis of signatures and content addressing, though passwords need a deliberately slow algorithm such as bcrypt or Argon2 rather than a general-purpose hash.',
    ],
    faq: [
      { q: 'Which algorithm should I use?', a: 'SHA-256 is the sensible default. SHA-512 is also strong. Avoid MD5 and SHA-1 for anything security-related — both have practical collision attacks — though they remain fine as quick non-security checksums.' },
      { q: 'Can I hash a password with this?', a: 'You can, but you should not store the result. Password storage needs a slow, salted algorithm such as bcrypt, scrypt, or Argon2 specifically designed to resist brute force. General-purpose hashes are far too fast.' },
      { q: 'Can a hash be reversed?', a: 'Not directly — the function only runs one way. Short or common inputs can still be found by guessing and comparing, which is exactly why salting matters for passwords.' },
    ],
  },

  'markdown-preview': {
    about: [
      'Markdown is plain text that renders as formatted output, which is why it powers README files, documentation, issue trackers, and static sites. This editor shows your source and the rendered result together, so you can see immediately how a nested list, a table, or a code fence will actually appear.',
      'It also renders Mermaid diagrams, letting you describe a flowchart or sequence diagram in text and watch it draw. That is genuinely useful for sketching architecture in a README without opening a separate diagramming tool or committing a binary image.',
    ],
    faq: [
      { q: 'Which Markdown flavour is supported?', a: 'GitHub-flavoured Markdown, including tables, fenced code blocks, task lists, and strikethrough — so what you see here closely matches how a README will render on GitHub.' },
      { q: 'Is the rendered HTML safe?', a: 'Output is sanitised before display, which strips script and other dangerous markup. That protects you when previewing Markdown from an untrusted source.' },
      { q: 'Is my document stored?', a: PRIVACY_A },
    ],
  },

  'yaml-json': {
    about: [
      'YAML and JSON describe the same data with different priorities. JSON is strict and unambiguous, which suits APIs. YAML is easier to write and comments are allowed, which is why Kubernetes manifests, CI pipelines, and Docker Compose files use it. This converter moves data between the two in either direction.',
      'That is useful when an API hands you JSON but your config expects YAML, when you want to validate that a hand-written YAML file actually parses to the structure you intended, or when a subtle indentation mistake has produced a nested object where you meant a sibling key.',
    ],
    faq: [
      { q: 'Will my YAML comments survive the round trip?', a: 'No. JSON has no comment syntax, so comments are lost when converting to JSON and cannot be restored coming back. Keep the original file if the comments matter.' },
      { q: 'Why did my YAML value become true?', a: 'YAML interprets several bare words as booleans, and older parsers also treat yes, no, on, and off that way. Quote the value — "yes" — to keep it a string.' },
      { q: 'Why does indentation break my file?', a: 'YAML uses indentation for structure and forbids tabs. Mixing tabs and spaces, or misaligning by one space, silently changes the nesting. Converting to JSON is a quick way to see the structure you actually wrote.' },
    ],
  },

  'password-generator': {
    about: [
      'A strong password is long and unpredictable. Human-invented passwords are neither: they cluster around names, dates, and predictable substitutions that cracking tools try first. This generator uses your browser\'s cryptographic random number source to produce passwords with no such pattern.',
      'Length matters more than exotic characters. Each extra character multiplies the search space, so a long password drawn from a smaller alphabet usually beats a short one full of symbols. Generate a unique password per site and store them in a password manager rather than trying to remember them.',
    ],
    faq: [
      { q: 'How long should a password be?', a: 'Sixteen characters or more for anything that matters, and longer for accounts protecting money, email, or other accounts. Email in particular is worth extra care, because password resets flow through it.' },
      { q: 'Is the generated password sent anywhere?', a: 'No. It is generated in your browser with the Web Crypto API and never leaves the page. Nothing is logged or transmitted.' },
      { q: 'Are random characters better than a passphrase?', a: 'Both work if long enough. A passphrase of several unrelated random words is easier to type and remember; a random string is more compact. What matters is that a machine picked it, not you.' },
    ],
  },

  'uuid-generator': {
    about: [
      'A UUID is a 128-bit identifier that can be generated independently on any machine with a negligible chance of collision. That property is what makes it useful in distributed systems: a client, a worker, and a server can each mint IDs without coordinating through a central sequence.',
      'Version 4 UUIDs, which this tool generates, are almost entirely random. They are the usual choice for database primary keys, request and trace IDs, idempotency keys, and file names where you need uniqueness without revealing how many records exist — something a sequential integer ID leaks immediately.',
    ],
    faq: [
      { q: 'Can two UUIDs ever collide?', a: 'In theory yes, in practice no. A v4 UUID has 122 random bits; you would need to generate billions per second for many years before a collision became likely.' },
      { q: 'Are UUIDs good database keys?', a: 'They are convenient and avoid coordination, but random values scatter inserts across an index, which can hurt write performance and increase index size compared with a sequential key. Time-ordered variants such as UUIDv7 address that.' },
      { q: 'Are they secure to use as tokens?', a: 'A v4 UUID is random enough to be hard to guess, but it is an identifier, not a credential. Do not rely on unguessability alone to protect a resource — check authorisation as well.' },
    ],
  },

  'qr-generator': {
    about: [
      'QR codes and barcodes encode text in a form a camera can read. A QR code typically holds a URL, but it can equally carry Wi-Fi credentials, contact details, or any short string — which is why they appear on posters, menus, packaging, and event tickets.',
      'This generator also produces linear barcodes such as Code 128 and EAN, plus denser two-dimensional formats like PDF417 and Data Matrix used on identity documents and small components. Codes are rendered in your browser, so the data never leaves your machine.',
    ],
    faq: [
      { q: 'Do the generated codes expire?', a: 'No. The code is a direct encoding of your text, not a redirect through a tracking service, so it works forever and nobody can disable it or watch the scans.' },
      { q: 'Which barcode format should I choose?', a: 'QR for URLs and general text, Code 128 for internal labels and shipping, EAN or UPC for retail products, and Data Matrix or PDF417 where space is tight or the payload is larger.' },
      { q: 'Why will my QR code not scan?', a: 'Usually it is printed too small, has too little quiet space around it, or has insufficient contrast. Keep a clear margin, print it larger, and use dark on light rather than the reverse.' },
    ],
  },
}
