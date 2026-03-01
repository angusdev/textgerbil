# Contributing to TextGerbil

Welcome! We appreciate your interest in contributing to TextGerbil. Because this project is designed to be maintained and evolved by AI agents, we follow a unique contribution workflow.

## 🤖 The AI-Driven Workflow

To maintain the architectural integrity of our single-file codebase and avoid complex merge conflicts with parallel AI edits, **we do not merge Pull Request code directly.**

Instead, we use PRs as a blueprint. If your proposal is accepted, the maintainer will use your provided prompt and instructions to re-generate the change.

### How to Submit a Change

1.  **Draft Your Change**: Implement the feature or bug fix as you normally would. Ensure it follows the guidelines in [SPEC.md](SPEC.md).
2.  **Verify with Tests**: Run the test suite (`npm test`) and ensure all cases pass. Add new test cases for your features if applicable.
3.  **Prepare a Single-Shot Prompt**: Create a comprehensive, standalone prompt that an AI agent can use to implement your changes from scratch on the current codebase.
4.  **Open a Pull Request**: Use the provided PR template to document:
    *   What the change does.
    *   The **exact prompt** to reproduce the change.
    *   The **Agent/Model** that produced the reference code.
    *   The **Test Cases** used for verification.

### Code Style & Standards

*   **Single File Control**: Keep all logic inside `index.html` as per the spec.
*   **Aesthetics**: We prioritize a premium, modern look. Avoid basic styling.
*   **Linting**: Always run `npm run lint:fix` before submitting.

---

**Note:** The diff in your PR is for reference only and serves as a proof of concept. The final implementation will be generated based on your instructions.
