import { useEffect, useState } from "react";
import {
  actualDuration,
  modeLabels,
  summarize,
  type SessionResult,
} from "./model";
import { Modal } from "./ui";
import { theme } from "./theme";
export function Share({
  session,
  onClose,
}: {
  session?: SessionResult;
  onClose: () => void;
}) {
  const [blob, setBlob] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [message, setMessage] = useState("");
  const summary = session ? summarize(session.rounds) : null;
  const text = session
    ? `Beach Read · ${summary!.accuracy}% успешных ситуаций · ${summary!.score}/${summary!.maxScore} очков\n${modeLabels[session.settings.mode]} · ${actualDuration(session.settings)} с · ${session.rounds.length} ситуаций\nПоказ ${session.settings.exposure} с, ответ ${session.settings.answer} с, перерыв ${session.settings.breakSeconds ?? 0} с\nГлаза ${session.settings.eyes} см, прыжок ${session.settings.jump} см, сетка ${session.settings.net} см\n${location.origin}${location.pathname}`
    : `Beach Read · Тренируй чтение защиты в пляжном волейболе\n${location.origin}${location.pathname}`;
  useEffect(() => {
    if (!session) return;
    let active = true,
      url = "";
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const c = canvas.getContext("2d")!;
    c.fillStyle = theme("bg");
    c.fillRect(0, 0, 1200, 630);
    c.fillStyle = theme("accent");
    c.font = theme("export-brand-font");
    c.fillText("beach read", 70, 85);
    c.font = theme("export-score-font");
    c.fillText(`${summarize(session.rounds).accuracy}%`, 65, 300);
    c.fillStyle = theme("ink");
    c.font = theme("export-label-font");
    c.fillText(
      `успешных ситуаций · ${summary!.score}/${summary!.maxScore} очков`,
      75,
      352,
    );
    c.font = theme("export-detail-font");
    c.fillText(
      `${modeLabels[session.settings.mode]} · ${actualDuration(session.settings)} с · ${session.rounds.length} ситуаций`,
      75,
      435,
    );
    c.fillStyle = theme("muted");
    c.font = theme("export-small-font");
    c.fillText(
      `Показ ${session.settings.exposure} с / ответ ${session.settings.answer} с, перерыв ${session.settings.breakSeconds ?? 0} с`,
      75,
      485,
    );
    c.fillText(
      `Глаза ${session.settings.eyes} / прыжок ${session.settings.jump} / сетка ${session.settings.net} см`,
      75,
      525,
    );
    c.fillText("Читай поле. Находи свободное.", 75, 585);
    c.strokeStyle = theme("accent");
    c.lineWidth = 3;
    c.strokeRect(870, 150, 250, 330);
    for (let i = 1; i < 3; i++) {
      c.beginPath();
      c.moveTo(870 + (i * 250) / 3, 150);
      c.lineTo(870 + (i * 250) / 3, 480);
      c.stroke();
      c.beginPath();
      c.moveTo(870, 150 + i * 110);
      c.lineTo(1120, 150 + i * 110);
      c.stroke();
    }
    canvas.toBlob((b) => {
      if (active && b) {
        setBlob(b);
        url = URL.createObjectURL(b);
        setPreview(url);
      }
    }, "image/png");
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [session]);
  const share = async () => {
    if (!navigator.share) {
      setMessage(
        "Системное меню недоступно. Скопируй текст или скачай карточку.",
      );
      return;
    }
    try {
      const file = blob
        ? new File([blob], "beach-read.png", { type: "image/png" })
        : null;
      await navigator.share({
        title: "Beach Read",
        text,
        ...(file && navigator.canShare?.({ files: [file] })
          ? { files: [file] }
          : {}),
      });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setMessage(
          "Не удалось открыть отправку. Используй копирование или скачивание.",
        );
    }
  };
  return (
    <Modal
      title={session ? "Поделиться результатом" : "Поделиться Beach Read"}
      onClose={onClose}
    >
      {preview && (
        <img
          className="share-preview"
          src={preview}
          alt="Карточка результата Beach Read"
        />
      )}
      <label className="share-text">
        Текст для отправки
        <textarea
          readOnly
          value={text}
          rows={session ? 6 : 3}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <div className="actions">
        <button className="primary" onClick={share}>
          Поделиться
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setMessage("Текст скопирован.");
            } catch {
              setMessage("Выдели текст выше и скопируй вручную.");
            }
          }}
        >
          Копировать текст
        </button>
        {session && (
          <a
            className="button"
            href={preview || undefined}
            download="beach-read.png"
            aria-disabled={!blob}
            onClick={(e) => {
              if (!blob) e.preventDefault();
            }}
          >
            Скачать PNG
          </a>
        )}
      </div>
      {message && <p role="status">{message}</p>}
    </Modal>
  );
}
