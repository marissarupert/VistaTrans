"""Bundle the deck into one self-contained HTML file (fonts, images, CSS and
JS inlined) that opens with a double-click and can be emailed.

    python3 tools/build_single.py [out.html]
"""
import base64, mimetypes, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'VistaTrans-Stream.html'


def data_uri(rel):
    path = root / rel
    mime = mimetypes.guess_type(path.name)[0] or ('font/woff2' if path.suffix == '.woff2' else 'application/octet-stream')
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


html = (root / 'index.html').read_text()
css = (root / 'deck.css').read_text()
js = (root / 'deck.js').read_text()

css = re.sub(r'url\((assets/[^)]+)\)', lambda m: f'url({data_uri(m.group(1))})', css)
html = re.sub(r'<link rel="preload"[^>]*>\n', '', html)
html = html.replace('<link rel="stylesheet" href="deck.css">', f'<style>\n{css}</style>')
html = html.replace('<script src="deck.js"></script>', f'<script>\n{js}</script>')
html = re.sub(r'src="(assets/[^"]+)"', lambda m: f'src="{data_uri(m.group(1))}"', html)

assert 'assets/' not in html, 'unbundled asset reference left in the page'
out.write_text(html)
print(f'{out} ({out.stat().st_size / 1e6:.1f} MB)')
