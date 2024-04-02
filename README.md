# SecureTestBrowserWindowed
![preview](RunningPreview.png "SecureTestBrowser running as a chrome app on a chromebook")

### ***DISCLAIMER***
#### ***I DO NOT CONDONE CHEATING USING THIS***

## How to install?
##### ***do not download the source code, I have not uploaded all the files yet***
Download the ZIP file from the [Releases](https://github.com/crossjbly/SecureTestBrowserWindowed/releases) page, then go to `chrome://extensions` and turn on the developer mode toggle, then click load unpacked and right click on the ZIP file then click extract, then click on the folder and then click open. Now you can open it from the launcher.

## How was this done?
I used an extension called [Extension Source Downloader](https://chromewebstore.google.com/detail/extension-source-download/dlbdalfhhfecaekoakmanjflmdhmgpea) to download the [SecureTestBrowser](https://chromewebstore.google.com/detail/securetestbrowser/hblfbmjdaalalhifaajnnodlkiloengc) App source code as a ZIP archive, then I changed line 34 from '"kiosk_enabled": true,' to '"kiosk_enabled": false,' and did the same with line 35
