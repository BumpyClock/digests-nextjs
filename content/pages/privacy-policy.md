---
title: Privacy Policy
---

The privacy policy is simple: no personal data is collected, stored or shared with us. Your data will also never be used by us for any purpose without specific permission. Data is only used to provide the service and is not shared with any third party. Data sent to the server is not retained by the server and is specified below.

The app engages in no ad targeting, data mining, or other algorithmic targeting that may compromise your privacy, and we do not affiliate ourselves with any third parties that do so.

## Data collection

- Only the urls of your subscribed feeds are transmitted to the server to retrieve them. No IP address or other personal data is sent with any request or saved. You are free to review the source code of apps & API server to verify this.

- Google Analytics and Microsoft Clarity are used to collect anonymous usage data, these are opt-in and you can opt-out anytime. Google Analytics & Microsoft Clarity are used to improve the app.

## Data retention

We do not retain any data from you. Only the data required to provide the service is retained for a period of 30 days, this may change in the future.

- Links to RSS feeds and their cached content are cycled out of the cache after 30 days. This is done to improve performance, avoid processing the same content multiple times and avoid unnecessary requests to the upstream servers.

- Only links to RSS feeds are stored temporarily, no user identifiable data like email, name, IP address, etc. is sent to the server or retained by the server.

- Links to RSS feeds are not shared with any third party. You can host the digests-api server yourself, it is public source and available on GitHub and as a Docker image on Docker Hub. Apps may not provide the ability to switch to a self hosted API server but that functionality is on the roadmap and will eventually be available. You can build the apps yourself from source code and modify the API server URL to point to your own server or any other server you control or prefer.

## License and disclaimer

This software is provided for personal, non-commercial use only. Commercial use of this software is prohibited without prior written consent from the author.

All code (API Server, Web App, Windows App, and future apps), assets, and documentation are provided with no warranty, use at your own risk when using the apps or self hosting the API server. You are responsible for any damage caused by using this software.

You may not use the apps or API server for any purpose that is against the law.

You cannot use the apps or API server to send unsolicited emails, malware, viruses, illegal content, spam, or any other content that infringes on the rights of others or any other purpose that is not allowed by the terms of service of the email provider or the hosting provider or otherwise prohibited by law.

Code is public source. You are free to use the apps and API server for personal, non-commercial use.

## Links to source code

All code is public and available on GitHub. Please open issues if you have any suggestions or improvements.

[API server](https://github.com/BumpyClock/digests-api)

[Digests - Web app](https://github.com/BumpyClock/digests-web)

[Digests - Windows app](https://github.com/BumpyClock/Digests-Windows)

Source code for apps for other platforms will be made available as soon as possible.

## Docker image

The API server can be hosted on any server using the following Docker image:

```bash
docker pull bumpyclock/digests-api:latest
```
