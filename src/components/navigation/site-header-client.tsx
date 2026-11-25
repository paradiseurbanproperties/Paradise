"use client";

import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProfileRole } from "@/constants/access";
import { signOutAction } from "@/features/auth/actions/auth-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { PremiumAvatar } from "@/components/ui/premium-avatar";

type SiteHeaderClientProps = {
  session: { displayName: string; role: ProfileRole } | null;
};

type MenuLink = { href: string; label: string };

const roleLabels: Record<ProfileRole, string> = {
  client: "Cliente",
  agent: "Agente",
  admin: "Administrador",
};

const publicNavigation: MenuLink[] = [
  { href: "/", label: "Inicio" },
  { href: "/propiedades", label: "Propiedades" },
  { href: "/comparar", label: "Comparar" },
  { href: "/agentes", label: "Agentes" },
];

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden="true" className="site-nav__pending-indicator" /> : null;
}

function HeaderLink({
  href,
  children,
  className,
  current,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className: string;
  current: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      aria-current={current ? "page" : undefined}
      className={className}
      href={href}
      onClick={onClick}
      prefetch
    >
      {children}
      <PendingIndicator />
    </Link>
  );
}

function ProfileMenuLink({ href, label, onClick, current, badge }: MenuLink & { onClick: () => void; current: boolean; badge?: number }) {
  return (
    <HeaderLink className="site-profile-menu__link" current={current} href={href} onClick={() => {
      if (current) onClick();
    }}>
      <span>{label}</span>
      {badge ? <span className="site-profile-menu__badge" aria-label={`${badge} sin leer`}>{badge > 99 ? "99+" : badge}</span> : null}
    </HeaderLink>
  );
}

export function SiteHeaderClient({ session }: SiteHeaderClientProps) {
  const [openMenuState, setOpenMenuState] = useState<{ menu: "navigation" | "profile"; pathname: string } | null>(null);
  const [profileStats, setProfileStats] = useState<{ unreadCount: number; premium: boolean } | null>(null);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const openMenu = openMenuState?.pathname === pathname ? openMenuState.menu : null;
  const menuOpen = openMenu === "navigation";
  const profileOpen = openMenu === "profile";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setOpenMenuState(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuState(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!profileOpen || session?.role !== "client" || profileStats) return;
    let active = true;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const [{ count, error: notificationsError }, { data: subscription, error: subscriptionError }] = await Promise.all([
          supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
          supabase.from("subscriptions").select("id").eq("status", "active").gt("expires_at", new Date().toISOString()).limit(1).maybeSingle(),
        ]);
        if (active) {
          setProfileStats({
            unreadCount: notificationsError ? 0 : count ?? 0,
            premium: !subscriptionError && Boolean(subscription),
          });
        }
      } catch {
        if (active) setProfileStats({ unreadCount: 0, premium: false });
      }
    })();
    return () => { active = false; };
  }, [profileOpen, profileStats, session?.role]);

  function closeMenus() {
    setOpenMenuState(null);
  }

  function toggleMenu(menu: "navigation" | "profile") {
    setOpenMenuState(openMenu === menu ? null : { menu, pathname });
  }

  const isCurrent = (href: string) => {
    if (href === "/" || href === "/admin" || href === "/agente") return pathname === href;
    return pathname.startsWith(href);
  };
  const profileLabel = session
    ? `Abrir menú de ${session.displayName || roleLabels[session.role]}`
    : "Abrir cuenta, iniciar sesión o crear cuenta";

  return (
    <header className="site-header" ref={headerRef}>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <div className="site-header__inner">
        <Link
          aria-label="Paradise, ir al inicio"
          className="brand-lockup"
          href="/"
          onClick={closeMenus}
          prefetch
        >
          <Image
            alt="Logo de Paradise Bienes Raíces"
            className="site-logo site-logo--header"
            height={458}
            priority
            src="/icons/paradise.png"
            width={435}
          />
        </Link>

        <nav aria-label="Navegación principal" className="site-nav">
          <button
            aria-controls="site-main-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar navegación" : "Abrir navegación"}
            className="site-nav__menu-button"
            onClick={() => toggleMenu("navigation")}
            type="button"
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              {menuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <div
            className={`site-nav__links${menuOpen ? " site-nav__links--open" : ""}`}
            id="site-main-navigation"
          >
            {publicNavigation.map((item) => (
              <HeaderLink
                className="site-nav__link"
                current={isCurrent(item.href)}
                href={item.href}
                key={item.href}
                onClick={() => {
                  if (isCurrent(item.href)) closeMenus();
                }}
              >
                {item.label}
              </HeaderLink>
            ))}
          </div>
        </nav>

        <div className="site-header__actions">
          <ThemeToggle />
          <div className="site-profile">
            <button
              aria-controls="site-profile-menu"
              aria-expanded={profileOpen}
              aria-label={profileLabel}
              className={`site-profile__trigger${profileOpen ? " site-profile__trigger--open" : ""}`}
              onClick={() => toggleMenu("profile")}
              title={session?.displayName || "Mi cuenta"}
              type="button"
            >
              {session ? (
                <PremiumAvatar
                  label={`Avatar de ${roleLabels[session.role]}`}
                  premium={session.role === "client" && Boolean(profileStats?.premium)}
                  size="small"
                >
                  {(session.displayName.trim()[0] || roleLabels[session.role][0]).toUpperCase()}
                </PremiumAvatar>
              ) : (
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5.5 20c.5-3.4 2.8-5.2 6.5-5.2s6 1.8 6.5 5.2" />
                </svg>
              )}
              <span className="site-profile__chevron" aria-hidden="true">⌄</span>
            </button>

              <div className="site-profile-menu" hidden={!profileOpen} id="site-profile-menu">
                {session ? (
                  <>
                    <div className="site-profile-menu__identity">
                      <span className="site-profile-menu__name">{session.displayName || roleLabels[session.role]}</span>
                      <span className="site-profile-menu__role">
                        {session.role === "client" && profileStats?.premium ? "Cliente Premium" : roleLabels[session.role]}
                      </span>
                    </div>
                    <div className="site-profile-menu__group">
                      <p className="site-profile-menu__heading">Mi espacio</p>
                      <ProfileMenuLink current={isCurrent("/mi-cuenta")} href="/mi-cuenta" label="Mi cuenta" onClick={closeMenus} />
                      <ProfileMenuLink current={isCurrent("/premium")} href="/premium" label="Premium y suscripción" onClick={closeMenus} />
                      {session.role === "client" ? <>
                        <ProfileMenuLink current={isCurrent("/favoritos")} href="/favoritos" label="Favoritos y listas" onClick={closeMenus} />
                        <ProfileMenuLink current={isCurrent("/mi-actividad")} href="/mi-actividad" label="Mi actividad" onClick={closeMenus} />
                        <ProfileMenuLink badge={profileStats?.unreadCount} current={isCurrent("/notificaciones")} href="/notificaciones" label="Notificaciones" onClick={closeMenus} />
                      </> : null}
                    </div>
                    {session.role === "agent" ? (
                      <div className="site-profile-menu__group">
                        <p className="site-profile-menu__heading">Herramientas de agente</p>
                        <ProfileMenuLink current={isCurrent("/agente")} href="/agente" label="Mi cartera" onClick={closeMenus} />
                        <ProfileMenuLink current={isCurrent("/agente/leads")} href="/agente/leads" label="CRM" onClick={closeMenus} />
                      </div>
                    ) : null}
                    {session.role === "admin" ? (
                      <div className="site-profile-menu__group">
                        <p className="site-profile-menu__heading">Administración</p>
                        <ProfileMenuLink current={isCurrent("/admin")} href="/admin" label="Panel" onClick={closeMenus} />
                        <ProfileMenuLink current={isCurrent("/admin/propiedades")} href="/admin/propiedades" label="Inventario" onClick={closeMenus} />
                        <ProfileMenuLink current={isCurrent("/admin/suscripciones")} href="/admin/suscripciones" label="Suscripciones" onClick={closeMenus} />
                        <ProfileMenuLink current={isCurrent("/admin/usuarios")} href="/admin/usuarios" label="Usuarios" onClick={closeMenus} />
                        <ProfileMenuLink current={isCurrent("/admin/agentes")} href="/admin/agentes" label="Agentes" onClick={closeMenus} />
                        <ProfileMenuLink current={isCurrent("/admin/leads")} href="/admin/leads" label="CRM" onClick={closeMenus} />
                        <ProfileMenuLink current={isCurrent("/admin/configuracion")} href="/admin/configuracion" label="Configuración" onClick={closeMenus} />
                      </div>
                    ) : null}
                    <form action={signOutAction} className="site-profile-menu__footer">
                      <button className="site-profile-menu__signout" type="submit">Cerrar sesión</button>
                    </form>
                  </>
                ) : (
                  <div className="site-profile-menu__group">
                    <p className="site-profile-menu__heading">Tu cuenta</p>
                    <ProfileMenuLink current={isCurrent("/login")} href="/login" label="Iniciar sesión" onClick={closeMenus} />
                    <ProfileMenuLink current={isCurrent("/registro")} href="/registro" label="Crear cuenta" onClick={closeMenus} />
                    <ProfileMenuLink current={isCurrent("/premium")} href="/premium" label="Conocer Premium" onClick={closeMenus} />
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </header>
  );
}
