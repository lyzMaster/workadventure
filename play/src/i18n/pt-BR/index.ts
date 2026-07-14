import { deepmerge } from "deepmerge-ts";
import en_US from "../en-US";
import area from "./area";
import mapEditor from "./mapEditor";
import menu from "./menu";
import trigger from "./trigger";

const pt_BR = deepmerge(en_US, {
    area,
    mapEditor,
    menu,
    trigger,
});

export default pt_BR;
