import FormulaDetailClient from './FormulaDetailClient';

export default function FormulaDetailPage({ params }: { params: { formulaId: string } }) {
  return <FormulaDetailClient formulaId={decodeURIComponent(params.formulaId)} />;
}
