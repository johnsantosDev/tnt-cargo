<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class RegionContext
{
    public static function normalize(?string $region): ?string
    {
        if ($region === null) {
            return null;
        }

        $normalized = trim($region);

        return $normalized === '' ? null : $normalized;
    }

    public static function isManager(?object $user): bool
    {
        if (!$user) {
            return false;
        }

        return $user->hasAnyRole(['admin', 'manager']);
    }

    public static function userRegion(Request $request): ?string
    {
        return self::normalize($request->user()?->region);
    }

    public static function selectedRegion(Request $request): ?string
    {
        return self::normalize($request->get('region'));
    }

    public static function resolveWriteRegion(Request $request, ?string $payloadRegion = null): ?string
    {
        $user = $request->user();
        $payloadRegion = self::normalize($payloadRegion);

        if (self::isManager($user) && $payloadRegion !== null) {
            return $payloadRegion;
        }

        return self::userRegion($request) ?? $payloadRegion;
    }

    public static function apply(Builder $query, Request $request, string $column = 'region'): Builder
    {
        $user = $request->user();
        $selectedRegion = self::selectedRegion($request);

        if (self::isManager($user)) {
            if ($selectedRegion !== null) {
                $query->where($column, $selectedRegion);
            }

            return $query;
        }

        $userRegion = self::userRegion($request);
        if ($userRegion !== null) {
            $query->where($column, $userRegion);
        } else {
            // No region set on non-manager users: return no records for safety.
            $query->whereRaw('1 = 0');
        }

        return $query;
    }
}
