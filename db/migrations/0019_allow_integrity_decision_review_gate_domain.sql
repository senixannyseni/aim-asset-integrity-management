alter table review_gates
  drop constraint if exists review_gates_gate_domain_check;

alter table review_gates
  add constraint review_gates_gate_domain_check
  check (
    gate_domain is not null
    and length(trim(gate_domain)) > 0
  );
