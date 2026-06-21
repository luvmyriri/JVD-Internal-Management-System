<?php

namespace App\Exceptions;

class MaxPaxExceededException extends \Exception
{
    public function __construct(
        public readonly string $serviceName,
        public readonly int $requestedPax,
        public readonly int $remainingSlots,
        public readonly int $maxPax,
        public readonly ?string $travelDate,
    ) {
        parent::__construct(
            "Cannot book {$requestedPax} pax for \"{$serviceName}\" on {$travelDate}. Only {$remainingSlots} of {$maxPax} slots are available."
        );
    }
}
