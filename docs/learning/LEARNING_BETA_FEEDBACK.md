# Learning beta feedback

Use this template when reporting learning-guides issues during the private beta.

## Message template

```text
Summary: (one line)

Steps:
1.
2.
3.

Expected:
Actual:

Build: (frontend SHA / backend SHA)
VITE_LEARNING_GUIDES_ENABLED: true|false
Browser:
Account: (handle or omit for privacy)
```

## Contact channel

Operators configure one of:

| Env | Where | Example |
|-----|--------|---------|
| `BETA_FEEDBACK_URL` | Backend `.env` (documented) | `https://forms.example/learning-beta` |
| `VITE_BETA_FEEDBACK_URL` | Frontend build-time | same URL or `mailto:feedback@example.com` |

When unset, the dashboard welcome banner omits the feedback link; the profile **Danger zone** and export scope copy still apply.

## Out of scope for 7G

Learning **content** abuse reports (guides are private R1). Continue using Discover profile reporting for practice-profile abuse only.