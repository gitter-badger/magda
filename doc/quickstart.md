1. Install minikube https://github.com/kubernetes/minikube/releases
2. Install helm https://github.com/kubernetes/helm/blob/master/docs/install.md
3. Create secrets: `deploy/helm/create-auth-secrets.sh`
4. Create connector config:
```bash
cd deploy
npm run create-connector-configmap
```
5. Find out the latest release version from https://github.com/TerriaJS/magda/releases
6. Install MAGDA:
```bash
helm install --name magda deploy/helm/magda --set global.image.tag=<LATEST-RELEASE-GOES-HERE> --set global.noDbAuth=true
```

If this doesn't work for you, [file an issue](https://github.com/TerriaJS/magda/issues).
