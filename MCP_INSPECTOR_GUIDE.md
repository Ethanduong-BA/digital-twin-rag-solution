# MCP Inspector - Usage Guide

## Khởi động MCP Inspector

```bash
cd /Users/khoaduong/Downloads/Digital_twin_RAG/digital-twin-rag-solution/mcp-server
npx @modelcontextprotocol/inspector node dist/index.js
```

Sẽ mở browser tại `http://localhost:6274`

## Gọi Tool trong Inspector

### Step 1: Select Tool
Trong sidebar, click vào tool `compare_profile_with_job`

### Step 2: Provide Parameters
**QUAN TRỌNG**: Bạn PHẢI pass parameter `job_filename`

Format JSON trong input field:
```json
{
  "job_filename": "week3-job01-the-star-entertainment-group-data-analyst.md"
}
```

### Step 3: Available Job Files
Chọn một trong những file này:
- `week3-job01-the-star-entertainment-group-data-analyst.md`
- `week3-job02-capgemini-data-analyst.md`
- `week3-job03-the-star-entertainment-group-uiux-designer.md`
- `week3-job04-hays-data-analyst.md`
- `week3-job05-move-recruitment-data-analyst.md`

### Step 4: Execute
Click "Call Tool" button

## Troubleshooting

### Error: "job_filename parameter is required"
**Nguyên nhân**: Bạn không pass parameter hoặc pass rỗng

**Giải pháp**: 
- Đảm bảo input JSON có `job_filename` key
- Giá trị phải là tên file hợp lệ (không rỗng)

### Error: "Job file not found"
**Nguyên nhân**: Tên file không chính xác hoặc file không tồn tại

**Giải pháp**: 
- Kiểm tra tên file chính xác từ danh sách trên
- Không thêm path, chỉ cần tên file

### Error: "Job path is not a file: .../jobs (isDirectory: true)"
**Nguyên nhân**: MCP Inspector pass empty string làm job_filename

**Giải pháp**:
- Đảm bảo input JSON có giá trị: `{ "job_filename": "week3-job01-..." }`
- Không để trống

## Example JSON Inputs

✅ **Valid:**
```json
{ "job_filename": "week3-job01-the-star-entertainment-group-data-analyst.md" }
```

❌ **Invalid:**
```json
{ "job_filename": "" }
{ }
{ "job_filename": null }
```

## Expected Output

Khi thành công, bạn sẽ thấy JSON response:
```json
{
  "jobTitle": "Data Analyst",
  "company": "The Star Entertainment Group",
  "matchPoints": [
    {
      "skill": "Power BI/Tableau",
      "proficiency": "intermediate"
    },
    ...
  ],
  "gapPoints": [...],
  "matchPercentage": 18,
  "overallScore": 3,
  "recommendation": "..."
}
```

## Server Logs

Khi gọi tool, server in ra logs để debug:
```
[MCP] Tool called: compare_profile_with_job
[MCP] Arguments type: object
[MCP] Arguments: { "job_filename": "..." }
[MCP] jobFilename value: "..."
[MCP] jobFilename type: string
```

Nếu có lỗi validation:
```
[MCP] Validation failed: job_filename parameter is required...
```

Bạn có thể thấy logs trong terminal nơi bạn chạy Inspector command.
