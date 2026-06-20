import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { C } from "@/lib/adminColors";
import { fileToAvatarDataUrl } from "@/lib/image";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/** Avatar presentacional: foto se existir, senão iniciais num gradiente. */
export function UserAvatar({
  name,
  src,
  size = 40,
  rounded = 12,
}: {
  name: string;
  src?: string | null;
  size?: number;
  rounded?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ height: size, width: size, borderRadius: rounded, objectFit: "cover" }}
        className="flex-shrink-0"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{
        height: size,
        width: size,
        borderRadius: rounded,
        fontSize: size * 0.36,
        background: C.navy,
      }}
    >
      {initials(name)}
    </div>
  );
}

/** Avatar editável: clique → escolher ficheiro → reduz → onPick(dataUrl). */
export function AvatarEditable({
  name,
  src,
  size = 76,
  rounded = 999,
  onPick,
  onError,
}: {
  name: string;
  src?: string | null;
  size?: number;
  rounded?: number;
  onPick: (dataUrl: string) => Promise<void> | void;
  onError?: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await onPick(dataUrl);
    } catch (e: any) {
      onError?.(e?.message ?? "Falha ao carregar a imagem.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      aria-label="Mudar foto de perfil"
      title="Mudar foto"
      className="relative group flex-shrink-0"
      style={{ height: size, width: size, borderRadius: rounded }}
    >
      <UserAvatar name={name} src={src} size={size} rounded={rounded} />
      <span
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ borderRadius: rounded, background: "rgba(0,0,0,0.45)", color: "#fff" }}
      >
        {busy ? <Loader2 className="animate-spin" size={size * 0.28} /> : <Camera size={size * 0.28} />}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </button>
  );
}
