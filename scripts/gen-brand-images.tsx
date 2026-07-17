/**
 * Generates the favicon, apple touch icon and social-preview image as real
 * PNG files under public/.
 *
 * This deliberately does NOT run as part of `next build`. Next's file-
 * convention icons (app/icon.tsx etc.) get exported by `output: "export"`
 * as extensionless route files ("icon", "opengraph-image", no ".png") —
 * fine for `next start`, which sets the Content-Type header itself, but
 * GitHub Pages has no server logic and infers Content-Type from the file
 * extension. An extensionless file serves as application/octet-stream,
 * which silently breaks the favicon and every link-preview crawler. Real
 * committed .png files sidestep that entirely.
 *
 * Re-run by hand whenever the mark changes:
 *   npx tsx scripts/gen-brand-images.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const fontDir = join(process.cwd(), "assets/fonts");
const playfair = readFileSync(join(fontDir, "PlayfairDisplay-Bold.ttf"));
const karla = readFileSync(join(fontDir, "Karla-SemiBold.ttf"));

async function toBuffer(res: InstanceType<typeof ImageResponse>): Promise<Buffer> {
  return Buffer.from(await res.arrayBuffer());
}

function mark(fontSize: number, marginTop: number, radius?: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#c2410c",
        ...(radius ? { borderRadius: radius } : {}),
      }}
    >
      <span
        style={{
          fontFamily: "Playfair Display",
          fontSize,
          color: "#fbf7f2",
          lineHeight: 1,
          marginTop,
        }}
      >
        S
      </span>
    </div>
  );
}

async function main() {
  const iconSize = { width: 256, height: 256 };
  const icon = await toBuffer(
    new ImageResponse(mark(190, -8, 56), {
      ...iconSize,
      fonts: [{ name: "Playfair Display", data: playfair, weight: 700 }],
    }),
  );
  writeFileSync("public/icon.png", icon);

  const appleSize = { width: 180, height: 180 };
  const apple = await toBuffer(
    new ImageResponse(mark(132, -6), {
      ...appleSize,
      fonts: [{ name: "Playfair Display", data: playfair, weight: 700 }],
    }),
  );
  writeFileSync("public/apple-touch-icon.png", apple);

  const ogSize = { width: 1200, height: 630 };
  const og = await toBuffer(
    new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 90px",
            background: "#fbf7f2",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#c2410c",
            }}
          >
            <span
              style={{
                fontFamily: "Playfair Display",
                fontSize: 48,
                color: "#fbf7f2",
                lineHeight: 1,
                marginTop: -3,
              }}
            >
              S
            </span>
          </div>
          <span
            style={{
              fontFamily: "Playfair Display",
              fontSize: 108,
              color: "#2a1a12",
              lineHeight: 1,
              marginTop: 28,
            }}
          >
            Shelf Life
          </span>
          <span
            style={{
              fontFamily: "Karla",
              fontSize: 32,
              color: "#6b5a4e",
              marginTop: 22,
            }}
          >
            Cooked Sunday, still good Thursday.
          </span>
        </div>
      ),
      {
        ...ogSize,
        fonts: [
          { name: "Playfair Display", data: playfair, weight: 700 },
          { name: "Karla", data: karla, weight: 600 },
        ],
      },
    ),
  );
  writeFileSync("public/og-image.png", og);

  console.log("wrote public/icon.png, public/apple-touch-icon.png, public/og-image.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
