import * as express from "express";
import * as path from "path";
import * as URI from "urijs";
import * as yargs from "yargs";
import * as morgan from "morgan";
import * as helmet from "helmet";

import Registry from "@magda/typescript-common/dist/registry/RegistryClient";

import buildSitemapRouter from "./buildSitemapRouter";

const argv = yargs
    .config()
    .help()
    .option("listenPort", {
        describe: "The TCP/IP port on which the web server should listen.",
        type: "number",
        default: 6107
    })
    .option("disableAuthenticationFeatures", {
        describe: "True to disable all features that require authentication.",
        type: "boolean",
        default: false
    })
    .option("baseExternalUrl", {
        describe:
            "The absolute base URL of the Magda site, when accessed externally. Used for building sitemap URLs which must be absolute.",
        type: "string",
        default: "http://localhost:6100/",
        required: true
    })
    .option("registryApiBaseUrlInternal", {
        describe: "The url of the registry api for use within the cluster",
        type: "string",
        default: "http://localhost:6101/v0",
        required: true
    })
    .option("baseUrl", {
        describe:
            "The base URL of the MAGDA Gateway, for building the base URLs of the APIs when not manually specified. Can be relative.",
        type: "string",
        default: "/"
    })
    .option("apiBaseUrl", {
        describe:
            "The base URL of the MAGDA API Gateway.  If not specified, the URL is built from the baseUrl.",
        type: "string"
    })
    .option("searchApiBaseUrl", {
        describe:
            "The base URL of the MAGDA Search API.  If not specified, the URL is built from the apiBaseUrl.",
        type: "string"
    })
    .option("registryApiBaseUrl", {
        describe:
            "The base URL of the MAGDA Registry API.  If not specified, the URL is built from the apiBaseUrl.",
        type: "string"
    })
    .option("authApiBaseUrl", {
        describe:
            "The base URL of the MAGDA Auth API.  If not specified, the URL is built from the apiBaseUrl.",
        type: "string"
    })
    .option("discussionsApiBaseUrl", {
        describe:
            "The base URL of the MAGDA Discussions API.  If not specified, the URL is built from the apiBaseUrl.",
        type: "string"
    })
    .option("adminApiBaseUrl", {
        describe:
            "The base URL of the MAGDA admin API.  If not specified, the URL is built from the apiBaseUrl.",
        type: "string"
    }).argv;

var app = express();

app.use(
    helmet({
        hsts: {
            maxAge: 31536000,
            includeSubdomains: true,
            preload: true
        }
    })
);

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            scriptSrc: [
                "'self'",
                "'unsafe-eval'", // for vega until we banish it into an iframe
                "'unsafe-inline'", // for VWO until... we get rid of that? :(
                "data:", // ditto
                "browser-update.org",
                "dev.visualwebsiteoptimizer.com",
                "platform.twitter.com",
                "www.googletagmanager.com",
                "www.google-analytics.com",
                "rum-static.pingdom.net"
            ],
            objectSrc: ["'none'"],
            sandbox: ["allow-scripts", "allow-same-origin", "allow-popups"],
            reportUri: argv.baseUrl + "api/v0/feedback/csp"
        } as helmet.IHelmetContentSecurityPolicyDirectives,
        browserSniff: false
    })
);

app.use(morgan("combined"));

const magda = path.join(__dirname, "..", "node_modules", "@magda");

const clientRoot = path.join(magda, "web-client");
const clientBuild = path.join(clientRoot, "build");
console.log("Client: " + clientBuild);

const adminRoot = path.join(magda, "web-admin");
const adminBuild = path.join(adminRoot, "build");
console.log("Admin: " + adminBuild);

const apiBaseUrl = addTrailingSlash(
    argv.apiBaseUrl || new URI(argv.baseUrl).segment("api").toString()
);

app.get("/server-config.js", function(req, res) {
    const config = {
        disableAuthenticationFeatures: argv.disableAuthenticationFeatures,
        baseUrl: addTrailingSlash(argv.baseUrl),
        apiBaseUrl: apiBaseUrl,
        searchApiBaseUrl: addTrailingSlash(
            argv.searchApiBaseUrl ||
                new URI(apiBaseUrl)
                    .segment("v0")
                    .segment("search")
                    .toString()
        ),
        registryApiBaseUrl: addTrailingSlash(
            argv.registryApiBaseUrl ||
                new URI(apiBaseUrl)
                    .segment("v0")
                    .segment("registry")
                    .toString()
        ),
        authApiBaseUrl: addTrailingSlash(
            argv.authApiBaseUrl ||
                new URI(apiBaseUrl)
                    .segment("v0")
                    .segment("auth")
                    .toString()
        ),
        discussionsApiBaseUrl: addTrailingSlash(
            argv.discussionsApiBaseUrl ||
                new URI(apiBaseUrl)
                    .segment("v0")
                    .segment("discussions")
                    .toString()
        ),
        adminApiBaseUrl: addTrailingSlash(
            argv.adminApiBaseUrl ||
                new URI(apiBaseUrl)
                    .segment("v0")
                    .segment("admin")
                    .toString()
        ),
        previewMapBaseUrl: addTrailingSlash(
            argv.previewMapBaseUrl ||
                new URI(apiBaseUrl)
                    .segment("..")
                    .segment("preview-map")
                    .toString()
        )
    };
    res.type("application/javascript");
    res.send("window.magda_server_config = " + JSON.stringify(config) + ";");
});

app.use("/admin", express.static(adminBuild));
app.use(express.static(clientBuild));

// URLs in this list will load index.html and be handled by React routing.
const topLevelRoutes = [
    "search",
    "feedback",
    "contact",
    "account",
    "sign-in-redirect",
    "dataset",
    "projects",
    "publishers"
];

topLevelRoutes.forEach(topLevelRoute => {
    app.get("/" + topLevelRoute, function(req, res) {
        res.sendFile(path.join(clientBuild, "index.html"));
    });
    app.get("/" + topLevelRoute + "/*", function(req, res) {
        res.sendFile(path.join(clientBuild, "index.html"));
    });
});

app.get("/page/*", function(req, res) {
    res.sendFile(path.join(clientBuild, "index.html"));
});

app.get("/admin", function(req, res) {
    res.sendFile(path.join(adminBuild, "index.html"));
});
app.get("/admin/*", function(req, res) {
    res.sendFile(path.join(adminBuild, "index.html"));
});
app.use(
    "/sitemap",
    buildSitemapRouter({
        baseExternalUrl: argv.baseExternalUrl,
        registry: new Registry({ baseUrl: argv.registryApiBaseUrlInternal })
    })
);

app.listen(argv.listenPort);
console.log("Listening on port " + argv.listenPort);

process.on("unhandledRejection", (reason: string, promise: any) => {
    console.error(reason);
});

function addTrailingSlash(url: string) {
    if (!url) {
        return url;
    }

    if (url.lastIndexOf("/") !== url.length - 1) {
        return url + "/";
    } else {
        return url;
    }
}
