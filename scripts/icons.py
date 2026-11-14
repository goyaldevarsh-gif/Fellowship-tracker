from playwright.sync_api import sync_playwright
jobs=[('scripts/icon.svg','public/pwa-192.png',192),('scripts/icon.svg','public/pwa-512.png',512),('scripts/icon.svg','public/apple-touch-icon.png',180),('scripts/maskable.svg','public/pwa-maskable-512.png',512)]
with sync_playwright() as p:
    b=p.chromium.launch()
    for src,out,s in jobs:
        svg=open(src).read().replace('<svg ',f'<svg width="{s}" height="{s}" ',1)
        pg=b.new_page(viewport={'width':s,'height':s})
        pg.set_content(f'<body style="margin:0">{svg}</body>')
        pg.screenshot(path=out,omit_background=True); pg.close()
    b.close()
