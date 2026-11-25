import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions/notification-actions";
import { listOwnNotifications } from "@/features/notifications/repositories/notification-repository";
import { listPublicProperties } from "@/features/properties/repositories/property-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Notificaciones" };

const stageLabels: Record<string, string> = {
  new: "nueva",
  contacted: "contactada",
  interested: "con interés",
  visit_scheduled: "con visita programada",
  negotiation: "en negociación",
  closed: "cerrada",
  lost: "finalizada",
};

export default async function NotificationsPage() {
  await requireProfileRole(["client"]);
  const [{ notifications, unreadCount, unavailable }, properties] = await Promise.all([
    listOwnNotifications(),
    listPublicProperties(),
  ]);
  const visibleProperties = new Map(properties.map((property) => [property.id, property]));

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main notifications-main" id="main-content">
        <div className="notifications-content">
          <header className="notifications-heading">
            <div><p className="eyebrow">Tu espacio Paradise</p><h1>Notificaciones</h1><p>Avisos dentro de Paradise sobre tu cuenta y tus consultas.</p></div>
            {unreadCount ? <form action={markAllNotificationsReadAction}><button className="button button--secondary button--small" type="submit">Marcar todas como leídas</button></form> : null}
          </header>
          {unavailable ? (
            <section className="notifications-empty" role="alert"><h2>No se pudieron cargar las notificaciones</h2><p>Comprueba que la migración 0017 esté aplicada.</p></section>
          ) : notifications.length ? (
            <ol className="notification-list">
              {notifications.map((notification) => {
                const property = notification.propertyId ? visibleProperties.get(notification.propertyId) : undefined;
                const message = notification.notificationType === "premium_activated"
                  ? "Tu suscripción Premium está activa."
                  : notification.notificationType === "premium_cancelled"
                    ? "Tu suscripción Premium fue cancelada."
                    : `El estado de tu consulta cambió a ${stageLabels[notification.stage ?? ""] ?? "actualizado"}.`;
                return (
                  <li className={`notification-item${notification.readAt ? " notification-item--read" : ""}`} key={notification.id}>
                    <span aria-hidden="true" className="notification-item__marker" />
                    <div className="notification-item__body">
                      <p>{message}{notification.notificationType === "inquiry_stage_changed" ? property ? <>: <Link href={`/propiedad/${property.slug}`}>{property.title}</Link></> : <span> (la ficha ya no está disponible)</span> : null}</p>
                      <time dateTime={notification.createdAt}>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</time>
                    </div>
                    {!notification.readAt ? (
                      <form action={markNotificationReadAction}>
                        <input name="notificationId" type="hidden" value={notification.id} />
                        <button aria-label="Marcar notificación como leída" className="notification-item__read" type="submit">Marcar leída</button>
                      </form>
                    ) : <span className="notification-item__read-label">Leída</span>}
                  </li>
                );
              })}
            </ol>
          ) : (
            <section className="notifications-empty"><span aria-hidden="true">♧</span><h2>No tienes notificaciones</h2><p>Te avisaremos aquí cuando cambie el estado de una consulta o una suscripción.</p><Link className="button button--secondary button--medium" href="/premium">Ver Premium</Link></section>
          )}
          <p className="notifications-note">Estos avisos aparecen dentro de la aplicación. No se envían por correo ni por SMS.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
