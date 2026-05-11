import sys
import os
import site

user_site = site.getusersitepackages()
if user_site not in sys.path:
    sys.path.insert(0, user_site)

from streamlit.web import cli as stcli

if __name__ == "__main__":
    sys.argv = ["streamlit", "run", "app.py", "--server.port=8501"]
    stcli.main()
