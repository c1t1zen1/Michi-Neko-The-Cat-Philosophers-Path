# Catalog thumbnail provenance

The catalog uses **386 compact WebP images** from the rendered construction
review on 10 November 2026. They occupy 2.45 MB of image data. Every image is
360 × 300 pixels; the viewport is fitted without stretching or cropping the
model out of its original rendered frame.

`thumbnails.json` maps **386 individual specimens or benches** to their
images. It also selects an evidence-backed thumbnail for **134 of the 190
inventory entries**. The remaining 56 entries have no suitable captured image
and should display the catalog's type placeholder or a live preview. They
must not inherit an unrelated image and present it as their original model.

## What the labels mean

- `original`: a capture of the game's real builder, component or character
  inside its lab reference scene. The label names the exact reference.
- `study`: a redesigned lab specimen, technique study or explicitly labeled
  baseline reconstruction. This does not claim the result is in the game.
- `context`: the inventory asset is embedded in a larger reference scene,
  has only related evidence, or is an intentionally empty inactive baseline.
  The label and optional note retain that limitation.

For example, Larry's thumbnail shows his complete original corral and is
labeled as context. Jade Paw uses that same corral reference, with the note
that the original reward is hidden. The source image does not pretend to
show an isolated reward.

## Source and matching

The source captures are the review's `after-final/<lab>/tile-NN.png` files.
Their capture report records card index and text, and the 15 workshop labs
also record specimen IDs. The bespoke Ground, Water, Machiya, Sky, Pagoda,
Grass and Interiors catalogs were imported in a browser to read their actual
exported display order and IDs. Each ID was matched against the captured
card's name before processing. Card prose and labels were excluded from the
thumbnail crop.

Five Range Lab references use its separately captured stack, leaf-mass wall,
edge and air benches plus the hero view. The construction review made no
Range Lab geometry changes between those captures and its final pass.

Ground's `today`, Water's baseline river/bridge/paddy studies and Moon Pool's
synthetic moon-disc baseline are conservatively labeled as reconstructions,
even when their original shelf caption calls them the game baseline. The
inactive petal-drift specimen is an explicitly empty contextual reference.

No concept artwork, AI-generated model image or unrelated stock image is
used. Multiple inventory entries can share a specimen image through the
manifest; the files are not duplicated per asset.

## Refreshing

Re-render the relevant lab's actual specimen after its geometry changes,
preserving its selector and provenance label. Export a viewport-only WebP
at 360 × 300, update `capturedAt`, and keep a contextual label when the image
shows an assembly or only a related technique. Verify that every manifest
path exists and every asset ID is still present in
`labs/asset_inventory.json`.
