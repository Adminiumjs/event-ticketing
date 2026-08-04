/**
 * The 404.
 *
 * It exists because the `View` union has a member for it and `App.tsx` maps
 * every member to a screen — so a link that goes nowhere lands somewhere
 * honest instead of on a blank shell.
 */

import { Compass } from "lucide-react";

import { useI18n } from "../i18n/index.tsx";
import { useStore } from "../state/store.ts";
import { Button, Empty } from "../components/Primitives.tsx";

export default function NotFound() {
  const { t } = useI18n();
  const go = useStore((s) => s.go);
  const persona = useStore((s) => s.persona);

  return (
    <div className="wv-screen wv-narrowcol">
      <p className="wv-404 wv-mono">{t("notfound.code")}</p>
      <Empty
        icon={<Compass size={22} aria-hidden="true" />}
        title={t("notfound.title")}
        body={t("notfound.body")}
        action={
          <Button onClick={() => go(persona === "organizer" ? "sales" : "home")}>
            {t("notfound.cta")}
          </Button>
        }
      />
    </div>
  );
}
