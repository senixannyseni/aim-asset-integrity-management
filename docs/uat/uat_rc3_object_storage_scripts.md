# RC3-B UAT Object Storage Scripts

Use placeholder values only. Do not paste real secrets into this document.

## 1. Confirm containers and environment

```powershell
Get-ChildItem Env:OBJECT_STORAGE_ENDPOINT,Env:OBJECT_STORAGE_BUCKET,Env:OBJECT_STORAGE_REGION

docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

## 2. Login

```powershell
$baseUrl = "http://localhost:4000"
$login = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/auth/login" -ContentType "application/json" -Body (@{
  email = "engineer@aim.local"
  password = "<PASSWORD>"
} | ConvertTo-Json)
$token = $login.data.accessToken
$headers = @{ Authorization = "Bearer $token" }
```

## 3. Request evidence upload URL

```powershell
$assetId = "22000000-0000-4000-8000-000000000001"
$evidencePath = ".\uat-evidence.pdf"
$fileSize = (Get-Item $evidencePath).Length
$fileHash = (Get-FileHash -Path $evidencePath -Algorithm SHA256).Hash.ToLowerInvariant()

$uploadUrl = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/evidence/upload-url" -Headers $headers -ContentType "application/json" -Body (@{
  asset_id = $assetId
  evidence_code = "EVD-2026-UAT-001"
  filename = "uat-evidence.pdf"
  mime_type = "application/pdf"
  size_bytes = $fileSize
  checksum_sha256 = $fileHash
} | ConvertTo-Json)
```

## 4. Upload file to object storage

```powershell
$uploadHeaders = @{ "Content-Type" = "application/pdf" }
if ($uploadUrl.data.required_headers."x-amz-meta-checksum_sha256") {
  $uploadHeaders["x-amz-meta-checksum_sha256"] = $uploadUrl.data.required_headers."x-amz-meta-checksum_sha256"
}
Invoke-WebRequest -Method Put -Uri $uploadUrl.data.upload_url -Headers $uploadHeaders -InFile $evidencePath
```

## 5. Complete evidence upload

```powershell
$complete = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/evidence/complete-upload" -Headers $headers -ContentType "application/json" -Body (@{
  upload_session_id = $uploadUrl.data.upload_session_id
  checksum_sha256 = $fileHash
} | ConvertTo-Json)
```

## 6. Request evidence download URL

```powershell
$evidenceId = $complete.data.evidence_id
$download = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/evidence/$evidenceId/download-url" -Headers $headers
```

## 7. Create report export

```powershell
$reportId = "38000000-0000-4000-8000-000000000001"
$export = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/reports/$reportId/exports" -Headers $headers -ContentType "application/json" -Body (@{
  export_type = "json"
} | ConvertTo-Json)
```

## 8. Request report export download URL

```powershell
$exportId = $export.data.report_export_id
$exportDownload = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/report-exports/$exportId/download-url" -Headers $headers
```

## 9. Token/signed URL leakage scan

```powershell
Get-ChildItem . -Recurse -File | Select-String -Pattern "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|X-Amz-Signature|X-Amz-Credential"
```

Expected: no evidence package or audit export should contain raw JWTs or unredacted signed URL secrets.
