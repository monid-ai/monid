import {
    zDistanceMetric,
    zImageData,
    zImageOptions,
} from "../../../schema/common.ts";

export const zVerifyBody = zImageOptions.extend({
    img1: zImageData,
    img2: zImageData,
    distance_metric: zDistanceMetric.optional(),
});
