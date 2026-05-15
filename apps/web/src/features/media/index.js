const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function validateMedia(file) {
  if (!file) return { ok: false, reason: "No file selected" };
  if (!ACCEPTED_TYPES.includes(file.type)) return { ok: false, reason: "Unsupported file type" };
  if (file.size > MAX_SIZE_BYTES) return { ok: false, reason: "File exceeds 5MB" };
  return { ok: true };
}

export function bindMediaUpload(root, onValidFile) {
  const input = root.querySelector("#media-upload");
  const status = root.querySelector("#media-status");
  const preview = root.querySelector("#media-preview");
  if (!input) return;

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    const result = validateMedia(file);

    if (!result.ok) {
      if (status) status.textContent = result.reason;
      if (preview) {
        preview.src = "";
        preview.classList.add("hidden");
      }
      return;
    }

    if (status) status.textContent = "Ready to upload";
    if (preview && file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const isSafeImageDataUrl = /^data:image\\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(dataUrl);
        if (!isSafeImageDataUrl) {
          if (status) status.textContent = "Invalid preview payload";
          preview.src = "";
          preview.classList.add("hidden");
          return;
        }
        preview.src = dataUrl;
        preview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    }

    onValidFile(file);
  });
}
