# Deploy in 5 minutes (no Git required)

## 1. Install the deployment tool
```powershell
npm install -g @azure/static-web-apps-cli
```
Behind the corporate proxy, if npm fails on a certificate error:
```powershell
npm config set cafile "$env:USERPROFILE\corp-roots.pem"
```

## 2. Get the deployment token
Azure Portal -> PowerBI-List -> Overview -> "Manage deployment token" -> copy.

## 3. Check the images are in place
```powershell
dir C:\portal\app\assets\logo.png
dir C:\portal\app\assets\tiles
```
16 tile files must be there, named exactly as in the SharePoint list.

## 4. Deploy
```powershell
cd C:\portal
swa deploy .\app --deployment-token "<token>" --env production
```

Live at: https://ashy-hill-06cc70f00.7.azurestaticapps.net

## If sign-in causes trouble during the demo
Swap in the public config and redeploy:
```powershell
copy app\staticwebapp.config.public.json app\staticwebapp.config.json /Y
swa deploy .\app --deployment-token "<token>" --env production
```
The page becomes open to anyone with the link. The dashboards themselves stay
protected - Power BI enforces its own permissions on every link.
Put the auth config back afterwards.

## Redeploy after any change
Re-run the same `swa deploy` command. It takes about a minute.
