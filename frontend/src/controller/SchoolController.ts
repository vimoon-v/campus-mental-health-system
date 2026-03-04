import {Controller} from "./Controller";

export interface ListSchoolRequest {
    provinceCode?: number;
    provinceName?: string;
}

export class SchoolController extends Controller {
    listByProvince = this._get<ListSchoolRequest, string[]>("api/school/list");
}
