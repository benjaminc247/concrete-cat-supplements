import { genPageBodyFromJson } from "./page-generator.js"

try {
    genPageBodyFromJson("./coffee-enhancer.json");
}
catch (err) {
    console.log("Error generating coffee enhancer page: " + err);
}
