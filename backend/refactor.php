<?php

$controllers = [
    'TripTicketController' => 'app/Http/Controllers/TripTicketController.php',
    'BillingController' => 'app/Http/Controllers/Accounting/BillingController.php',
    'CashBudgetRequestController' => 'app/Http/Controllers/CashBudgetRequestController.php',
];

foreach ($controllers as $name => $path) {
    if (!file_exists($path)) {
        echo "Missing $path\n";
        continue;
    }

    $content = file_get_contents($path);
    $serviceName = str_replace('Controller', 'Service', $name);
    $servicePath = 'app/Services/' . $serviceName . '.php';

    // 1. Generate Service
    $serviceContent = preg_replace('/namespace App\\\\Http\\\\Controllers.*?;/', 'namespace App\Services;', $content);
    $serviceContent = preg_replace('/use App\\\\Http\\\\Controllers\\\\Controller;/', '', $serviceContent);
    $serviceContent = preg_replace('/class ' . $name . ' extends Controller/', 'class ' . $serviceName, $serviceContent);
    $serviceContent = preg_replace('/class ' . $name . '(?! extends)/', 'class ' . $serviceName, $serviceContent);
    
    file_put_contents($servicePath, $serviceContent);

    // 2. Generate Thin Controller
    preg_match('/namespace (App\\\\Http\\\\Controllers.*?);/', $content, $nsMatch);
    $namespace = $nsMatch[1] ?? 'App\Http\Controllers';
    
    // Find all 'use' statements except Controller
    preg_match_all('/use .*?;/', $content, $useMatches);
    $uses = implode("\n", $useMatches[0]);
    $uses = preg_replace('/use App\\\\Http\\\\Controllers\\\\Controller;\n?/', '', $uses);

    // Find public functions
    preg_match_all('/public function ([a-zA-Z0-9_]+)\((.*?)\)/', $content, $methodMatches);

    $methods = [];
    for ($i = 0; $i < count($methodMatches[0]); $i++) {
        $methodName = $methodMatches[1][$i];
        if ($methodName === '__construct') continue;

        $argsStr = $methodMatches[2][$i];
        $vars = [];
        if (trim($argsStr) !== '') {
            $parts = explode(',', $argsStr);
            foreach ($parts as $part) {
                preg_match('/\$[a-zA-Z0-9_]+/', $part, $varMatch);
                if (isset($varMatch[0])) {
                    $vars[] = $varMatch[0];
                }
            }
        }
        $varsStr = implode(', ', $vars);

        $methods[] = "    public function {$methodName}({$argsStr})\n    {\n        return \$this->service->{$methodName}({$varsStr});\n    }";
    }

    $methodsStr = implode("\n\n", $methods);

    $controllerContent = <<<PHP
<?php

namespace {$namespace};

use App\Http\Controllers\Controller;
use App\Services\\{$serviceName};
{$uses}

class {$name} extends Controller
{
    private {$serviceName} \$service;

    public function __construct({$serviceName} \$service)
    {
        \$this->service = \$service;
    }

{$methodsStr}
}
PHP;

    file_put_contents($path, $controllerContent);
    echo "Refactored $name\n";
}
