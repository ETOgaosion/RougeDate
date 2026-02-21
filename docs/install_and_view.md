# Install and view website

## 1) Install dependencies

From project root (`D:\Code\RougeDate`):

```powershell
npm install
```

If PowerShell blocks `npm` scripts on your machine, run:

```powershell
npm.cmd install
```

## 2) Start development website

```powershell
npm run dev
```

Alternative when PowerShell blocks scripts:

```powershell
npm.cmd run dev
```

Vite will print a local URL. Open it in your browser (typically `http://localhost:5173`).

## 3) Build production files

```powershell
npm run build
```

Built files are created in `dist/`.

## Date arrangement input format

Create files in `date_arrangement` using this naming pattern:

- `time_1.json`
- `time_2.json`
- `time_3.json`

Each file should contain at least:

```json
{
  "city": "your city name",
  "duration": "e.g. 2 days",
  "mate": "name"
}
```

The page reads all `time_x.json` files, finds the maximum `x`, and renders line blocks from that range.
