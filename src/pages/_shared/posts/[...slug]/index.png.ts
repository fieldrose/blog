import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import satori from "satori";
import sharp from "sharp";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import { stripStaticAssetPrefix } from "@/utils/withBase";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  // 仅为未设置自定义 ogImage 且非草稿的文章生成动态 OG 图
  const posts = await getCollection("posts").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props, url }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  const fonts = fontData["--font-google-sans-code"];
  const regularFontPath = getFontPathByWeight(fonts, 400);
  const boldFontPath = getFontPathByWeight(fonts, 700);

  if (regularFontPath === undefined || boldFontPath === undefined) {
    throw new Error("Cannot find the font path.");
  }

  // 拉取常规与粗体字重字体文件，供 satori 内嵌使用
  const [regularData, boldData] = await Promise.all([
    fetch(
      stripStaticAssetPrefix(experimental_getFontFileURL(regularFontPath, url))
    ).then(res => res.arrayBuffer()),
    fetch(
      stripStaticAssetPrefix(experimental_getFontFileURL(boldFontPath, url))
    ).then(res => res.arrayBuffer()),
  ]);

  // React 19 类型不再直接接受 satori 的普通节点对象，
  // 这里断言为 satori 期望的元素类型（运行时不变）。
  const ogElement = {
    type: "div",
    props: {
      style: {
        background: "#fefbfb",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: "-1px",
              right: "-1px",
              border: "4px solid #000",
              background: "#ecebeb",
              opacity: "0.9",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "center",
              margin: "2.5rem",
              width: "88%",
              height: "80%",
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              border: "4px solid #000",
              background: "#fefbfb",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "center",
              margin: "2rem",
              width: "88%",
              height: "80%",
            },
            children: {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  margin: "20px",
                  width: "90%",
                  height: "90%",
                },
                children: [
                  {
                    type: "p",
                    props: {
                      style: {
                        fontSize: 72,
                        fontWeight: "bold",
                        maxHeight: "84%",
                        overflow: "hidden",
                      },
                      children: props.data.title,
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                        marginBottom: "8px",
                        fontSize: 28,
                      },
                      children: [
                        {
                          type: "span",
                          props: {
                            children: [
                              "by ",
                              {
                                type: "span",
                                props: {
                                  style: { color: "transparent" },
                                  children: '"',
                                },
                              },
                              {
                                type: "span",
                                props: {
                                  style: {
                                    overflow: "hidden",
                                    fontWeight: "bold",
                                  },
                                  children: props.data.author,
                                },
                              },
                            ],
                          },
                        },
                        {
                          type: "span",
                          props: {
                            style: { overflow: "hidden", fontWeight: "bold" },
                            children: config.site.title,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  } as unknown as Parameters<typeof satori>[0];

  // 用 satori 渲染 SVG，再由 sharp 转为 PNG 返回
  const svg = await satori(ogElement, {
    width: 1200,
    height: 630,
    embedFont: true,
    fonts: [
      {
        name: "Google Sans Code",
        data: regularData,
        weight: 400,
        style: "normal",
      },
      {
        name: "Google Sans Code",
        data: boldData,
        weight: 700,
        style: "normal",
      },
    ],
  });

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
