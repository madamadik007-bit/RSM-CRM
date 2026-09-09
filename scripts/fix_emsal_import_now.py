from pathlib import Path

worker = Path('worker.js')
s = worker.read_text(encoding='utf-8')
s2 = s.replace('for (let i=0;i<data.emsal.length;i+=40) {', 'for (let i=0;i<data.emsal.length;i+=10) {')
s2 = s2.replace('const chunk=data.emsal.slice(i,i+40);', 'const chunk=data.emsal.slice(i,i+10);')
if s2 == s:
    print('worker batch pattern not found')
else:
    worker.write_text(s2, encoding='utf-8')

ui = Path('ui.js')
u = ui.read_text(encoding='utf-8')
u2 = u.replace('/assets/app.css?v=5', '/assets/app.css?v=6').replace('/assets/app.js?v=5', '/assets/app.js?v=6')
if u2 != u:
    ui.write_text(u2, encoding='utf-8')
    print('UI cache bumped to v6')
else:
    print('UI cache already bumped')
