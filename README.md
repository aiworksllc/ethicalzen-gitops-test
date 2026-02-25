# EthicalZen Guardrails-as-Code: Sample Repository

This is a reference implementation showing how customers organize their guardrail configurations in a Git repository for use with the EthicalZen GitOps pipeline.

## Directory Structure

```
sample-repo/
├── guardrails/
│   ├── global/                          # Shared guardrails available to all contracts
│   │   └── pii_blocker/
│   │       ├── config.yaml              # Guardrail definition (apiVersion: ethicalzen.ai/v1)
│   │       └── index.js                 # Evaluation function (for regex/keyword types)
│   └── custom/                          # Tenant-specific guardrails
│       └── claims_approval_blocker/
│           └── config.yaml              # Smart Guardrail (ssg_v3) definition
├── contracts/
│   └── claims-bot.yaml                  # Deterministic Contract binding guardrails to a service
├── tests/
│   └── pii_blocker_test.yaml            # Test suite for guardrail validation
├── environments/
│   ├── production.yaml                  # Production environment overrides
│   └── dev.yaml                         # Development environment overrides
└── README.md
```

## Concepts

### Guardrails

Guardrails are safety rules that evaluate AI inputs and outputs. They live under `guardrails/` and are organized into two categories:

- **global/** -- Guardrails that apply across all services and tenants. These are typically compliance-driven (PII detection, prompt injection blocking, toxicity filtering).
- **custom/** -- Tenant-specific guardrails tailored to a particular business domain or use case. These often use Smart Guardrails (ssg_v3) with natural language definitions and semantic evaluation.

Each guardrail is a directory containing:

| File | Required | Description |
|------|----------|-------------|
| `config.yaml` | Yes | Guardrail definition following the `ethicalzen.ai/v1` schema |
| `index.js` | For regex/keyword types | JavaScript evaluation function |

### Contracts

Contracts bind one or more guardrails to a specific AI service. They define:

- Which service the contract protects (endpoint, model)
- Which guardrails are attached (by name and version)
- Envelope constraints (thresholds for blocking/allowing requests)

### Environments

Environment files provide per-environment overrides for guardrail behavior:

- **production.yaml** -- Strict settings: `block` actions, lower thresholds
- **dev.yaml** -- Relaxed settings: `log` or `review` actions, higher thresholds for experimentation

### Tests

Test suites validate guardrail behavior with known inputs and expected outcomes. Each test case specifies an input string and the expected action (`allow`, `review`, or `block`).

## Schema Reference

All YAML files use `apiVersion: ethicalzen.ai/v1` and one of the following `kind` values:

| Kind | Description |
|------|-------------|
| `Guardrail` | A guardrail definition (regex, keyword, composite, or ssg_v3) |
| `Contract` | A binding of guardrails to an AI service |
| `TestSuite` | Test cases for guardrail validation |
| `Environment` | Per-environment configuration overrides |

## Using with EthicalZen GitOps

### Prerequisites

1. An EthicalZen tenant account with an API key
2. The EthicalZen CLI installed (`npm install -g @ethicalzen/cli`)
3. A Git repository with your guardrail configurations

### Schema Validation

Validate your YAML files against the EthicalZen schema before committing:

```bash
# Validate all guardrail configs
ez validate guardrails/

# Validate a specific file
ez validate guardrails/global/pii_blocker/config.yaml

# Validate contracts
ez validate contracts/

# Validate test suites
ez validate tests/

# Run all validations
ez validate .
```

### Running Tests Locally

Execute your test suites against the local guardrail definitions:

```bash
# Run all test suites
ez test tests/

# Run a specific test suite
ez test tests/pii_blocker_test.yaml

# Run with verbose output
ez test tests/ --verbose
```

### Example Workflow

The standard GitOps workflow for guardrail changes:

```
1. Create branch        git checkout -b guardrail/update-pii-thresholds
                        |
2. Edit YAML            vim guardrails/global/pii_blocker/config.yaml
                        |
3. Validate locally     ez validate guardrails/global/pii_blocker/
                        |
4. Run tests            ez test tests/pii_blocker_test.yaml
                        |
5. Commit & push        git add . && git commit -m "tune pii thresholds" && git push
                        |
6. Open PR              GitHub/GitLab PR with review from security team
                        |
7. CI pipeline          Automated validation + test execution in CI
                        |
8. Merge to main        After approval, merge triggers deployment
                        |
9. Gateway sync         Pipeline calls EthicalZen API to sync guardrails to gateway
                        |
10. Verify              Confirm guardrail is active via gateway health check
```

### CI/CD Pipeline Integration

Add the following to your CI pipeline (GitHub Actions example):

```yaml
# .github/workflows/guardrails.yml
name: Guardrail CI
on:
  pull_request:
    paths:
      - 'guardrails/**'
      - 'contracts/**'
      - 'tests/**'
      - 'environments/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install EthicalZen CLI
        run: npm install -g @ethicalzen/cli
      - name: Validate schemas
        run: ez validate .
      - name: Run guardrail tests
        run: ez test tests/
      - name: Dry-run sync (no deploy)
        run: ez sync --dry-run --env dev
        env:
          EZ_DEV_API_KEY: ${{ secrets.EZ_DEV_API_KEY }}

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install EthicalZen CLI
        run: npm install -g @ethicalzen/cli
      - name: Sync to production gateway
        run: ez sync --env production
        env:
          EZ_PROD_API_KEY: ${{ secrets.EZ_PROD_API_KEY }}
```

### Gateway Sync

After merging, the pipeline syncs guardrail definitions to the EthicalZen gateway:

```bash
# Sync all guardrails and contracts to the production gateway
ez sync --env production

# Sync to a specific environment
ez sync --env dev

# Dry-run to preview changes without deploying
ez sync --dry-run --env production
```

## Guardrail Types

| Type | Description | Evaluation |
|------|-------------|------------|
| `regex` | Pattern-matching via regular expressions | JavaScript `index.js` function |
| `keyword` | Keyword/phrase blocklists | JavaScript `index.js` function |
| `composite` | Combines multiple guardrails with AND/OR logic | Delegates to child guardrails |
| `ssg_v3` | Smart Guardrail using semantic embeddings | EthicalZen ML engine (no custom code needed) |

## Best Practices

1. **Version your guardrails** -- Use semantic versioning in `metadata.version` so contracts can pin to specific versions.
2. **Write tests for every guardrail** -- Test suites catch regressions before they reach production.
3. **Use environment overrides** -- Keep dev relaxed (`log`/`review`) and production strict (`block`).
4. **Review guardrail PRs with domain experts** -- Security team for PII, legal team for compliance, business owners for custom guardrails.
5. **Never edit production guardrails directly** -- All changes flow through Git.
6. **Include calibration stats** -- Document accuracy, precision, recall, and F1 scores from validation datasets.
7. **Tag applicable regulations** -- `metadata.regulations` enables compliance reporting and audit trails.
