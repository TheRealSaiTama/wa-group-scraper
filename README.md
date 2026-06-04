# WA Group Scraper

Chrome extension to scrape WhatsApp group members and export to XLSX/CSV.

## Install

1. Download or clone this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **"Load unpacked"** → select the `wa-group-scraper` folder

## Usage

1. Open [web.whatsapp.com](https://web.whatsapp.com)
2. Open any group chat
3. Click the extension icon → **"Scrape Members"**
4. XLSX file auto-downloads

Or use the floating **"WA Scraper"** widget on the page → **"Scrape Members"** for CSV.

## Features

- Works on any group size (5 members or 500+)
- No "View all" needed — just open the group chat
- Exports Name, Phone Number, Description, Group Name
- XLSX (from popup) or CSV (from widget)
- 100% local — no data sent anywhere

## Tech

- Manifest V3 Chrome Extension
- [SheetJS](https://sheetjs.com/) for XLSX generation
- Reads member data from WhatsApp Web's conversation header
