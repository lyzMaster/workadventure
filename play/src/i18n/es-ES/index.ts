import { deepmerge } from "deepmerge-ts";
import en_US from "../en-US";
import area from "./area";
import mapEditor from "./mapEditor";
import menu from "./menu";
import trigger from "./trigger";

const es_ES = deepmerge(en_US, {
    area,
    mapEditor,
    menu,
    trigger,
});

export default es_ES;
