"use client";

import { useActionState } from "react";
import { assignPropertyToAgentAction, revokePropertyAssignmentAction } from "@/features/agents/actions/agent-assignment-actions";
import type { AgentAssignedProperty, AssignableProperty } from "@/features/agents/repositories/agent-repository";
import type { AuthActionState } from "@/features/auth/types/auth-action";

const initialState: AuthActionState = { status: "idle", message: "" };

export function AgentAssignmentControls({
  agentId,
  properties,
  assignments,
}: {
  agentId: string;
  properties: AssignableProperty[];
  assignments: AgentAssignedProperty[];
}) {
  const [state, formAction, pending] = useActionState(assignPropertyToAgentAction, initialState);
  const assignedIds = new Set(assignments.map((item) => item.id));
  const unassignedProperties = properties.filter((item) => !assignedIds.has(item.id));

  return (
    <section className="agent-assignment-manager" aria-label="Asignaciones de propiedades">
      <div className="agent-assignment-manager__header">
        <div>
          <p className="eyebrow">Cartera asignada</p>
          <h4>{assignments.length} {assignments.length === 1 ? "propiedad activa" : "propiedades activas"}</h4>
        </div>
      </div>
      {assignments.length ? (
        <ul className="agent-assignment-list">
          {assignments.map((assignment) => <AssignmentRow assignment={assignment} key={assignment.assignmentId} />)}
        </ul>
      ) : <p className="agent-assignment-manager__empty">Todavía no tiene propiedades asignadas.</p>}
      {unassignedProperties.length ? (
        <form action={formAction} className="agent-assignment-form">
          <input name="agentId" type="hidden" value={agentId} />
          <label className="auth-field">
            <span>Asignar propiedad</span>
            <select defaultValue="" name="propertyId" required>
              <option disabled value="">Selecciona una propiedad</option>
              {unassignedProperties.map((property) => (
                <option key={property.id} value={property.id}>{property.title} · {property.city}, {property.state}</option>
              ))}
            </select>
          </label>
          <button className="button button--secondary button--small" disabled={pending} type="submit">
            {pending ? "Asignando…" : "Asignar"}
          </button>
          {state.message ? <p aria-live="polite" className={`agent-assignment-feedback agent-assignment-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
        </form>
      ) : properties.length ? (
        <p className="agent-assignment-manager__empty">Todas las propiedades disponibles ya están asignadas a este agente.</p>
      ) : (
        <p className="agent-assignment-manager__empty">No hay propiedades registradas para asignar.</p>
      )}
    </section>
  );
}

function AssignmentRow({ assignment }: { assignment: AgentAssignedProperty }) {
  const [state, formAction, pending] = useActionState(revokePropertyAssignmentAction, initialState);
  return (
    <li className="agent-assignment-row">
      <div>
        <strong>{assignment.title}</strong>
        <span>{assignment.city}, {assignment.state} · {assignment.publicationStatus === "approved" ? "Publicada" : assignment.publicationStatus === "draft" ? "Borrador" : assignment.publicationStatus === "pending" ? "En revisión" : assignment.publicationStatus === "rejected" ? "Rechazada" : "Archivada"}</span>
      </div>
      <form action={formAction}>
        <input name="assignmentId" type="hidden" value={assignment.assignmentId} />
        <button className="button button--secondary button--small" disabled={pending} type="submit">{pending ? "Retirando…" : "Retirar"}</button>
        {state.message ? <span aria-live="polite" className={`agent-assignment-feedback agent-assignment-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</span> : null}
      </form>
    </li>
  );
}
