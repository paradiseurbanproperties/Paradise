import { LeadNoteForm, LeadStageControl } from "@/features/crm/components/lead-controls";
import { LEAD_STAGE_LABELS, LEAD_STAGES, type CrmLead } from "@/features/crm/types/lead";

export function LeadBoard({ leads }: { leads: CrmLead[] }) {
  return (
    <div aria-label="Tablero de leads" className="crm-board">
      {LEAD_STAGES.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage);
        return (
          <section aria-labelledby={`crm-stage-${stage}`} className="crm-column" key={stage}>
            <header className="crm-column__heading">
              <h2 id={`crm-stage-${stage}`}>{LEAD_STAGE_LABELS[stage]}</h2>
              <span>{stageLeads.length}</span>
            </header>
            <div className="crm-column__cards">
              {stageLeads.map((lead) => (
                <article className="crm-lead-card" key={lead.id}>
                  <p className="eyebrow">{lead.property?.title ?? "Consulta general"}{lead.property ? ` · ${lead.property.city}` : ""}</p>
                  <h3>{lead.contactName}</h3>
                  <a className="crm-lead-card__email" href={`mailto:${lead.contactEmail}`}>{lead.contactEmail}</a>
                  <time dateTime={lead.createdAt}>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lead.createdAt))}</time>
                  <p className="crm-lead-card__message">{lead.message}</p>
                  <LeadStageControl leadId={lead.id} stage={lead.stage} />
                  {lead.interactions.length ? (
                    <details className="crm-lead-notes">
                      <summary>Notas internas · {lead.interactions.length}</summary>
                      <ol>
                        {lead.interactions.map((interaction) => (
                          <li key={interaction.id}><p>{interaction.body}</p><time dateTime={interaction.createdAt}>{new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(interaction.createdAt))}</time></li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                  <LeadNoteForm leadId={lead.id} />
                </article>
              ))}
              {!stageLeads.length ? <p className="crm-column__empty">Sin leads en esta etapa.</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
