#!/usr/bin/env python3
"""Демо-копии сайта. `demos.py stale` — код 0, если в ветке gh-pages есть демо-папка с истёкшим сроком
(или действующая ещё не опубликована) и сайт нужно пересобрать; иначе код 1. `demos.py list` — список."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_app import active_demos

act = {d['id'] for d in active_demos()}
if sys.argv[1:] == ['list']:
    for d in active_demos():
        print(d['id'], 'до', d['until'], d.get('note', ''))
    sys.exit(0)
try:
    tree = subprocess.run(['git', 'ls-tree', '--name-only', 'gh-pages'], check=True, capture_output=True, text=True).stdout.split()
except subprocess.CalledProcessError:
    sys.exit(0)
pub = {x for x in tree if x.startswith('demo-')}
print('опубликованы:', sorted(pub), 'действуют:', sorted(act))
sys.exit(0 if pub != act else 1)
