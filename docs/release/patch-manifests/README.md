# Historical Patch Manifests

This folder stores historical RC3/RC4 changed-files package manifests that were previously kept in the repository root.

Purpose:

- preserve release and hotfix traceability;
- keep the repository root focused on active project entry points;
- reduce accidental commit/package confusion from generated patch manifests;
- keep patch-manifest evidence under the release documentation tree.

Operational rule:

- New generated changed-files package manifests should be reviewed, committed only when they are release evidence, and stored under this folder or a package-specific release report.
- Temporary local patch manifests should be deleted after merge and should not remain in the repository root.
