import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { verifyDocument, VerificationResult } from '@/api/verification';

export function PublicVerificationPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (!shortCode) {
      setError('Code manquant');
      setLoading(false);
      return;
    }
    verifyDocument(shortCode)
      .then((r) => setResult(r))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shortCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Vérification en cours…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">✕</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Document non vérifié</h1>
          <p className="text-slate-600">{error || 'Document introuvable'}</p>
          <p className="text-xs text-slate-400 mt-4">Code : {shortCode}</p>
        </div>
      </div>
    );
  }

  const isRevoked = !!result.revokedAt;
  const meta = result.meta || {};
  const school = result.school;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Vérification de document</h1>
          <p className="text-sm text-slate-500">Vérification de document</p>
        </div>

        <div
          className={`rounded-lg shadow-lg p-6 mb-4 ${
            isRevoked ? 'bg-red-50 border-2 border-red-300' : 'bg-green-50 border-2 border-green-300'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`text-3xl ${isRevoked ? 'text-red-500' : 'text-green-600'}`}>
              {isRevoked ? '✕' : '✓'}
            </div>
            <div>
              <h2 className={`font-bold text-lg ${isRevoked ? 'text-red-800' : 'text-green-800'}`}>
                {isRevoked ? 'Document révoqué' : 'Document authentique'}
              </h2>
              <p className={`text-sm ${isRevoked ? 'text-red-600' : 'text-green-600'}`}>
                {isRevoked
                  ? `Révoqué le ${new Date(result.revokedAt!).toLocaleDateString('fr-FR')}`
                  : 'Signé et vérifié'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h3 className="font-semibold text-slate-700 mb-4 pb-2 border-b">Informations du document</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Type</dt>
              <dd className="font-medium">{result.type}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Code</dt>
              <dd className="font-mono font-medium">{result.shortCode}</dd>
            </div>
            {meta.studentName && (
              <div>
                <dt className="text-slate-500">Élève</dt>
                <dd className="font-medium">{meta.studentName}</dd>
              </div>
            )}
            {meta.studentMatricule && (
              <div>
                <dt className="text-slate-500">Matricule</dt>
                <dd className="font-mono">{meta.studentMatricule}</dd>
              </div>
            )}
            {meta.className && (
              <div>
                <dt className="text-slate-500">Classe</dt>
                <dd className="font-medium">{meta.className}</dd>
              </div>
            )}
            {meta.academicYear && (
              <div>
                <dt className="text-slate-500">Année scolaire</dt>
                <dd>{meta.academicYear}</dd>
              </div>
            )}
            {meta.termName && (
              <div>
                <dt className="text-slate-500">Période</dt>
                <dd>{meta.termName}</dd>
              </div>
            )}
            {meta.average !== undefined && meta.average !== null && (
              <div>
                <dt className="text-slate-500">Moyenne</dt>
                <dd className="font-medium">
                  {meta.average} / {meta.scale || 20}
                </dd>
              </div>
            )}
            {meta.kind && (
              <div>
                <dt className="text-slate-500">Type de bulletin</dt>
                <dd>{meta.kind}</dd>
              </div>
            )}
            {meta.status && (
              <div>
                <dt className="text-slate-500">Statut</dt>
                <dd>{meta.status}</dd>
              </div>
            )}
          </dl>
        </div>

        {school && (
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="font-semibold text-slate-700 mb-2 pb-2 border-b">Établissement</h3>
            <p className="font-medium">{school.name}</p>
            {school.address && <p className="text-sm text-slate-500">{school.address}</p>}
            {school.phone && <p className="text-sm text-slate-500">{school.phone}</p>}
          </div>
        )}

        <div className="text-center text-xs text-slate-400 mt-6">
          <p>Document généré le {new Date(result.createdAt).toLocaleString('fr-FR')}</p>
          {result.viewCount !== undefined && <p>Consulté {result.viewCount} fois</p>}
        </div>
      </div>
    </div>
  );
}
