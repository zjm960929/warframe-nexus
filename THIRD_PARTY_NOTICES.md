# Third-party notices

The generated `index.html` and the Node server include or depend on the following
open-source packages. Their licenses remain in effect; this project's MIT license
does not replace them.

| Package | License | Use |
| --- | --- | --- |
| [warframe-worldstate-parser](https://github.com/WFCD/warframe-worldstate-parser) | MIT | Parse the official worldstate feed |
| [warframe-worldstate-data](https://github.com/WFCD/warframe-worldstate-data) | MIT | Official game names, nodes, and translations |
| [class-validator](https://github.com/typestack/class-validator) | MIT | Parser model validation |
| [class-transformer](https://github.com/typestack/class-transformer) | MIT | Parser model transformation |
| [reflect-metadata](https://github.com/rbuckton/reflect-metadata) | Apache-2.0 | Decorator metadata for the parser |
| [Rollup](https://github.com/rollup/rollup) | MIT | Build tooling |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | Apache-2.0 | Local browser OCR |
| [tesseract.js-core](https://github.com/naptha/tesseract.js-core) | Apache-2.0 | Tesseract WASM runtime |
| [Tesseract tessdata](https://github.com/tesseract-ocr/tessdata) | Apache-2.0 | Chinese and English OCR language data |

The screenshot scanner runs OCR locally in the browser. The selected image is
not uploaded to an OCR service. The Tesseract runtime and language data are
served from this project, and model files are cached by the browser after first
use.

Warframe game data, names, and assets are property of Digital Extremes. This is
an unofficial fan project and is not affiliated with Digital Extremes.
