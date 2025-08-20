import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import { getEnvVar } from "../utils/env";

cloudinary.config({
  cloud_name: getEnvVar("CLOUDINARY_CLOUD_NAME"),
  api_key: getEnvVar("CLOUDINARY_API_KEY"),
  api_secret: getEnvVar("CLOUDINARY_API_SECRET"),
});

type Data = 
  | {
      timestamp: number;
      signature: string;
      cloud_name: string;
      api_key: string;
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "GET") {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp },
      getEnvVar("CLOUDINARY_API_SECRET")
    );

    res.status(200).json({
      timestamp,
      signature,
      cloud_name: getEnvVar("CLOUDINARY_CLOUD_NAME"),
      api_key: getEnvVar("CLOUDINARY_API_KEY"),
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
