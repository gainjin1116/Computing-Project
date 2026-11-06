#!/bin/bash
cd "$(dirname "$0")"
export PYTEST_DISABLE_PLUGIN_AUTOLOAD=1
export PYTHONPATH="/opt/miniconda3/lib/python3.14/site-packages:/opt/Goloka/goloka-backend/.venv/lib/python3.12/site-packages:$PWD"
/opt/miniconda3/bin/python3 -m pytest -v test_main.py "$@"
