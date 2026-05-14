<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });

        $exceptions->render(function (QueryException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                report($e);

                $sqlState = $e->errorInfo[0] ?? null;
                $driverCode = $e->errorInfo[1] ?? null;
                $raw = (string) $e->getMessage();
                $message = 'Une erreur de base de données est survenue. Veuillez réessayer ou contacter l\'administrateur.';
                $status = 500;

                if ($sqlState === '23000') {
                    $status = 422;
                    if ($driverCode === 1452) {
                        if (str_contains($raw, 'status_id') || str_contains($raw, 'shipment_statuses')) {
                            $message = 'Les statuts d\'expédition ne sont pas configurés. Veuillez contacter l\'administrateur.';
                        } elseif (str_contains($raw, 'client_id')) {
                            $message = 'Le client sélectionné est introuvable.';
                        } elseif (str_contains($raw, 'shipment_id')) {
                            $message = 'L\'expédition liée est introuvable.';
                        } else {
                            $message = 'Un élément lié à cet enregistrement est introuvable. Vérifiez vos données.';
                        }
                    } elseif ($driverCode === 1062) {
                        $message = 'Cet enregistrement existe déjà (valeur unique en doublon).';
                    } elseif ($driverCode === 1451) {
                        $message = 'Impossible de supprimer cet élément car il est utilisé ailleurs.';
                    } elseif ($driverCode === 1048) {
                        $message = 'Un champ requis est manquant.';
                    }
                } elseif ($sqlState === '22001') {
                    $message = 'Une valeur saisie dépasse la longueur autorisée.';
                    $status = 422;
                } elseif ($sqlState === '22007' || $sqlState === '22008') {
                    $message = 'Format de date invalide.';
                    $status = 422;
                } elseif ($sqlState === '42S22') {
                    $message = 'Configuration manquante en base de données. Veuillez contacter l\'administrateur.';
                }

                return response()->json(['message' => $message], $status);
            }
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                if ($e instanceof HttpExceptionInterface || $e instanceof ValidationException) {
                    return;
                }
                report($e);
                return response()->json([
                    'message' => 'Une erreur interne est survenue. Veuillez réessayer.',
                ], 500);
            }
        });
    })->create();
