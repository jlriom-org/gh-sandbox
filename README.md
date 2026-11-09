# gh-sandbox

## Prevent new vulnerabilities


Como experto en GitHub Actions y GHAS,
Crea un procedimiento WorkFlow GitHub Action que impida introducir vulnerabilidad en la rama destino, por ejemplo master, sin bloquear las que ya existen en la rama de master

### Comportamiento esperado

El flujo será:

1.- Se crea un Pull Request hacia master.
2.- GitHub Actions ejecuta CodeQL sobre el código del PR.
3.- GitHub compara el resultado con la rama base master.
4.- Si el PR introduce una vulnerabilidad que supera el umbral configurado, el merge queda bloqueado.
5.- Las vulnerabilidades que ya existían en master, y cuyas líneas no forman parte del cambio del PR, no bloquean el merge.

La protección nativa de Code Scanning evalúa las alertas asociadas al código modificado. GitHub indica que, para que la regla bloquee el merge, todas las líneas señaladas por la alerta deben existir en el diff del Pull Request. Esta característica es precisamente la que permite mantener una línea base con deuda de seguridad sin permitir nueva deuda.

### Workflow de CodeQL

--> .github/workflows/codeql-pr-security-gate.yml

### Ejecutar el análisis inicial de master

Antes de activar el bloqueo:

1.- Incorporar el workflow a master.
2.- Ejecutarlo manualmente mediante workflow_dispatch.
3.- Confirmar que CodeQL analiza correctamente la rama.
4.- Revisar los resultados en:

```
    Security > Code scanning
```

Este primer análisis establece la situación actual de master. Las alertas existentes se gestionan como deuda de seguridad, pero no deben cerrarse como dismissed únicamente para conseguir que el gate funcione.

### Configurar el Ruleset

El workflow ejecuta CodeQL, pero el Ruleset es el control que impide hacer merge.

```
    Settings
        > Rules
            > Rulesets
                > New ruleset
                    > New branch ruleset
```

** Configurar **

```
Ruleset name:
Prevent new CodeQL vulnerabilities

Enforcement status:
Evaluate
```

Se recomienda comenzar en modo Evaluate durante aproximadamente una semana, revisar falsos positivos y errores de compilación, y después cambiarlo a Active. GitHub también propone utilizar inicialmente el modo de evaluación antes de activar la regla

** Rama destino **

En Target branches, seleccionar:

```
Include default branch
```

O utilizar el patrón:

```
master
```

** Requerir Pull Request **

Activar:

```
Require a pull request before merging
```

Configuración recomendada:

```
Required approvals: 1
Dismiss stale approvals: enabled
Require approval of the most recent push: enabled
Require conversation resolution: enabled
```

** Requerir Code Scanning **

Activar:

```
Require code scanning results
```

Añadir la Herramienta:

```
Tool: CodeQL
```

Umbral inicial recomendado:

```
Security alerts:
High or higher

Alerts:
Errors
```

GitHub permite configurar umbrales como Critical, High or higher, Medium or higher o All. También permite controlar separadamente los resultados no relacionados directamente con seguridad mediante Alerts.

Después del periodo de estabilización puede incrementarse a:

```
Security alerts:
Medium or higher
```

Finalmente cambiar:

```
Enforcement status:
Active
```

### 5. Por qué no bloquea las vulnerabilidades existentes

Supongamos que master contiene estas alertas:

| Alerta           | Estado en master | Modificada por el PR              | Resultado      |
| ---------------- | ---------------- | --------------------------------- | -------------- |
| SQL Injection A  | Existente        | No                                | No bloquea     |
| XSS B            | Existente        | No                                | No bloquea     |
| Path Traversal C | Nueva            | Sí	Bloquea                       |                |
| SQL Injection A  | Existente        | El PR modifica la zona vulnerable | Puede bloquear |

La última situación es importante. Si el Pull Request modifica las líneas asociadas a una vulnerabilidad histórica, CodeQL puede considerarla relevante para el PR. No debe utilizarse el concepto de línea base para permitir que un cambio mantenga o vuelva a introducir código vulnerable dentro del área modificada.

El objetivo es:

```
Deuda existente no modificada:
permitida temporalmente

Nueva vulnerabilidad:
bloqueada

Vulnerabilidad existente reintroducida o modificada:
reevaluada
```

### No utilizar solamente el resultado del job

No es suficiente configurar únicamente:

```
Require status checks to pass before merging
```

sobre el job CodeQL.

Un workflow puede finalizar correctamente porque el análisis se ejecutó y el SARIF se cargó correctamente, aunque CodeQL haya producido alertas. Por eso se debe utilizar la regla específica:

```
Require code scanning results
```

La protección de Code Scanning mediante Rulesets es independiente de los status checks tradicionales. Puede bloquear cuando CodeQL encuentra una alerta por encima del umbral, cuando el análisis sigue en curso o cuando la herramienta requerida no está configurada.

Se pueden mantener ambos controles:

```
Required status check:
CodeQL workflow finalizado correctamente

Code scanning rule:
No se han introducido alertas nuevas por encima del umbral
```

### Protecciones contra bypass

Configurar en el Ruleset:

```
Restrict deletions: enabled
Block force pushes: enabled
Require linear history: opcional
Require signed commits: según política corporativa
```

En Bypass list, limitar las excepciones a:

- Equipo de administradores de seguridad.
- Cuenta técnica de break-glass.
- Automatizaciones expresamente aprobadas.
- GitHub Apps que necesiten realizar merges controlados.

La opción de bypass debería exigir siempre Pull Request:

```
For pull requests only
```

Además, conviene activar:

```
Do not allow bypassing the above settings
```

si se utiliza branch protection clásica, o no incorporar administradores generales a la bypass list del Ruleset.

### Prueba de aceptación

** Caso positivo **

1.- Crear una rama desde master.
2.- Modificar un fichero sin introducir vulnerabilidades.
3.- Abrir PR hacia master.
4.- Esperar a CodeQL.
5.- Verificar que el Ruleset permite el merge aunque master tenga alertas históricas.

** Caso negativo **

Introducir temporalmente un patrón inseguro controlado, por ejemplo en JavaScript:

```Javascript

const express = require("express");
const cp = require("child_process");

const app = express();

app.get("/execute", (req, res) => {
  cp.exec(req.query.command, (error, stdout) => {
    res.send(stdout);
  });
});

```

Este ejemplo pasa entrada controlada por el usuario a child_process.exec y debería generar una detección de command injection.

La prueba se considera correcta si:

```
CodeQL analysis:
ejecutado

Code scanning alert:
detectado en el PR

Merge:
bloqueado por el Ruleset
```

Eliminar el código vulnerable después de validar el comportamiento.

### Política recomendada

```
security_gate_policy:
  target_branch: master

  scanner:
    tool: CodeQL
    query_suite: security-extended

  pull_request_threshold:
    initial: high
    target: medium

  existing_alerts:
    block_merge: false
    remediation: security_campaign

  new_alerts:
    critical: block
    high: block
    medium: block_after_stabilization
    low: report

  administration:
    ruleset_mode_initial: evaluate
    ruleset_mode_final: active
    bypass: restricted

  periodic_analysis:
    frequency: weekly
    blocks_pull_requests: false
```

### Resultado

La combinación correcta es:

```
CodeQL workflow
        +
Code Scanning Ruleset
        +
Pull Request obligatorio
        =
No se permite introducir nuevas vulnerabilidades
sin exigir corregir primero toda la deuda existente
```

Este enfoque establece un modelo práctico de“no empeorar la línea base”: la deuda histórica se remedia mediante un plan separado, mientras que cualquier vulnerabilidad nueva de severidad High o superior queda bloqueada inmediatamente.
