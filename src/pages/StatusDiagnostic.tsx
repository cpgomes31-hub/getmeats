import React, { useState } from 'react'
import { StatusManager } from '../firebase/statusManager'
import { getPurchasesForBox, getAllBoxes } from '../firebase/boxes'

export default function StatusDiagnostic() {
  const [boxId, setBoxId] = useState('')
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [allBoxes, setAllBoxes] = useState<any[]>([])
  const [loadingBoxes, setLoadingBoxes] = useState(false)

  const runDiagnostic = async () => {
    if (!boxId.trim()) {
      alert('Digite um Box ID')
      return
    }

    setLoading(true)
    try {
      const result = await StatusManager.diagnoseInconsistencies(boxId)
      setDiagnosticResult(result)
    } catch (error) {
      console.error('Erro no diagnóstico:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert('Erro ao executar diagnóstico: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fixIssues = async () => {
    if (!diagnosticResult?.fixes?.length) {
      alert('Nenhuma correção disponível')
      return
    }

    setLoading(true)
    try {
      for (const fix of diagnosticResult.fixes) {
        switch (fix.action) {
          case 'alignPurchasesWithBox':
            await StatusManager.changeBoxStatusSafe(
              fix.params.boxId, 
              fix.params.boxStatus, 
              { 
                userId: 'system-diagnostic',
                reason: 'Diagnostic alignment',
                force: true 
              }
            )
            break
          case 'changeBoxStatus':
            await StatusManager.changeBoxStatusSafe(
              fix.params.boxId, 
              fix.params.status, 
              { 
                userId: 'system-diagnostic',
                reason: 'Diagnostic correction',
                force: true 
              }
            )
            break
        }
      }
      
      alert('Correções aplicadas com sucesso!')
      
      // Re-executar diagnóstico
      await runDiagnostic()
      
    } catch (error) {
      console.error('Erro ao aplicar correções:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert('Erro ao aplicar correções: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const scanAllBoxes = async () => {
    setLoadingBoxes(true)
    try {
      const boxes = await getAllBoxes()
      const diagnosticResults = []
      
      for (const box of boxes.slice(0, 10)) { // Limitar a 10 para não sobrecarregar
        try {
          const result = await StatusManager.diagnoseInconsistencies(box.id)
          if (result.issues.length > 0) {
            diagnosticResults.push({
              boxId: box.id,
              boxName: box.name,
              status: box.status,
              ...result
            })
          }
        } catch (err) {
          console.error(`Erro diagnosticando box ${box.id}:`, err)
        }
      }
      
      setAllBoxes(diagnosticResults)
    } catch (error) {
      console.error('Erro ao escanear caixas:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert('Erro ao escanear caixas: ' + errorMessage)
    } finally {
      setLoadingBoxes(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <h1 className="text-2xl font-bold text-red-800 mb-2">
          🔴 DIAGNÓSTICO DE STATUS - SISTEMA CRÍTICO
        </h1>
        <p className="text-red-700">
          Esta ferramenta detecta e corrige inconsistências no sistema de status de caixas e pedidos.
        </p>
      </div>

      {/* Diagnóstico Individual */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Diagnóstico Individual</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={boxId}
            onChange={(e) => setBoxId(e.target.value)}
            placeholder="Digite o Box ID (ex: B0WJK2GNGIAduckZOVUs)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Analisando...' : 'Diagnosticar'}
          </button>
        </div>

        {diagnosticResult && (
          <div className="mt-4">
            <div className={`p-4 rounded-lg ${
              diagnosticResult.issues.length === 0 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <h3 className={`font-bold mb-2 ${
                diagnosticResult.issues.length === 0 
                  ? 'text-green-800' 
                  : 'text-red-800'
              }`}>
                {diagnosticResult.issues.length === 0 
                  ? '✅ Nenhum problema detectado' 
                  : `⚠️ ${diagnosticResult.issues.length} problema(s) detectado(s)`
                }
              </h3>
              
              {diagnosticResult.issues.length > 0 && (
                <>
                  <ul className="list-disc list-inside mb-4 text-red-700">
                    {diagnosticResult.issues.map((issue: string, index: number) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                  
                  {diagnosticResult.fixes.length > 0 && (
                    <button
                      onClick={fixIssues}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? 'Aplicando...' : `Aplicar ${diagnosticResult.fixes.length} Correção(ões)`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Escaneamento Geral */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Escaneamento Geral (10 caixas recentes)</h2>
          <button
            onClick={scanAllBoxes}
            disabled={loadingBoxes}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            {loadingBoxes ? 'Escaneando...' : 'Escanear Todas'}
          </button>
        </div>

        {allBoxes.length > 0 && (
          <div className="space-y-4">
            {allBoxes.map((box, index) => (
              <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-red-800">
                      {box.boxName} ({box.boxId})
                    </h4>
                    <p className="text-sm text-gray-600">Status: {box.status}</p>
                  </div>
                  <button
                    onClick={() => setBoxId(box.boxId)}
                    className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Investigar
                  </button>
                </div>
                
                <ul className="list-disc list-inside text-red-700">
                  {box.issues.map((issue: string, issueIndex: number) => (
                    <li key={issueIndex} className="text-sm">{issue}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {loadingBoxes && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            <p className="mt-2 text-gray-600">Escaneando caixas...</p>
          </div>
        )}
      </div>

      {/* Informações de Debug */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-bold mb-2">ℹ️ Informações de Debug</h3>
        <p className="text-sm text-gray-700 mb-2">
          <strong>Sistema Seguro:</strong> StatusManager implementado com prevenção de loops infinitos
        </p>
        <p className="text-sm text-gray-700 mb-2">
          <strong>Transações Atômicas:</strong> Firestore transactions para consistência
        </p>
        <p className="text-sm text-gray-700">
          <strong>Logs de Auditoria:</strong> Todas as mudanças são registradas com rastreabilidade
        </p>
      </div>
    </div>
  )
}