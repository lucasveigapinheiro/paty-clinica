// store.js - Armazenamento local (localStorage). Sem servidor, sem banco.
// Os dados ficam salvos no navegador deste computador.
(function (global) {
    const KEYS = {
        pacientes: 'labessie:pacientes',
        agendamentos: 'labessie:agendamentos'
    };

    function ler(chave) {
        try {
            return JSON.parse(localStorage.getItem(chave)) || [];
        } catch (e) {
            return [];
        }
    }

    function gravar(chave, valor) {
        localStorage.setItem(chave, JSON.stringify(valor));
    }

    function novoId(lista) {
        return lista.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    }

    const Store = {
        pacientes: {
            listar() {
                // mais recentes primeiro
                return ler(KEYS.pacientes).slice().sort((a, b) => b.id - a.id);
            },
            adicionar(paciente) {
                const lista = ler(KEYS.pacientes);
                const registro = {
                    ...paciente,
                    id: novoId(lista),
                    termoAssinado: paciente.termoAssinado ? 1 : 0,
                    foto: paciente.foto || '',
                    queixaPrincipal: paciente.queixaPrincipal || '',
                    alergias: paciente.alergias || '',
                    historicoProcedimentos: paciente.historicoProcedimentos || '',
                    observacoesMedicas: paciente.observacoesMedicas || ''
                };
                lista.push(registro);
                gravar(KEYS.pacientes, lista);
                return registro;
            }
        },

        agendamentos: {
            listarPorData(data) {
                return ler(KEYS.agendamentos)
                    .filter(a => a.data === data)
                    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
            },
            datasDoMes(ano, mes) {
                const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
                const datas = ler(KEYS.agendamentos)
                    .map(a => a.data)
                    .filter(d => d && d.startsWith(prefixo));
                return [...new Set(datas)];
            },
            adicionar(agendamento) {
                const lista = ler(KEYS.agendamentos);
                const registro = {
                    paciente: agendamento.paciente,
                    procedimento: agendamento.procedimento,
                    data: agendamento.data,
                    horaInicio: agendamento.horaInicio,
                    horaFim: agendamento.horaFim,
                    status: agendamento.status || 'Agendado',
                    id: novoId(lista)
                };
                lista.push(registro);
                gravar(KEYS.agendamentos, lista);
                return registro;
            },
            remover(id) {
                const lista = ler(KEYS.agendamentos).filter(a => String(a.id) !== String(id));
                gravar(KEYS.agendamentos, lista);
            }
        }
    };

    global.Store = Store;
})(window);
