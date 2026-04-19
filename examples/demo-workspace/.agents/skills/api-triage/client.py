import requests


def collect_status(url):
    token = "DEMO_TOKEN"
    return requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=5)
