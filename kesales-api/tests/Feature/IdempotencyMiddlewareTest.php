<?php

namespace Tests\Feature;

use App\Http\Middleware\IdempotencyMiddleware;
use Illuminate\Http\Request;
use Tests\TestCase;

class IdempotencyMiddlewareTest extends TestCase
{
    private const CHECKOUT_PATH = '/api/v1/checkout';

    public function test_duplicate_request_during_processing_does_not_run_handler_twice(): void
    {
        $user = $this->authenticateCustomer();
        $middleware = new IdempotencyMiddleware();
        $executions = 0;
        $request = Request::create(self::CHECKOUT_PATH, 'POST', ['items' => []]);
        $request->headers->set('Idempotency-Key', 'checkout-in-progress');
        $request->setUserResolver(fn () => $user);

        $response = $middleware->handle($request, function () use (
            $middleware,
            $user,
            &$executions
        ) {
            $executions++;
            $duplicate = Request::create(self::CHECKOUT_PATH, 'POST', ['items' => []]);
            $duplicate->headers->set('Idempotency-Key', 'checkout-in-progress');
            $duplicate->setUserResolver(fn () => $user);

            $duplicateResponse = $middleware->handle($duplicate, function () use (&$executions) {
                $executions++;
                return response()->json(['success' => true], 201);
            });

            $this->assertSame(409, $duplicateResponse->getStatusCode());

            return response()->json(['success' => true], 201);
        });

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame(1, $executions);
    }

    public function test_same_key_for_same_request_replays_and_different_payload_is_rejected(): void
    {
        $user = $this->authenticateCustomer();

        $requestA = Request::create(self::CHECKOUT_PATH, 'POST', [
            'items' => [[
                'variant_id' => 'variant-1',
                'quantity' => 1,
            ]],
            'shipping_address' => [
                'full_name' => 'Jane Doe',
                'phone' => '0712345678',
                'county' => 'Nairobi',
                'town' => 'Westlands',
                'street_address' => 'Sample Road 1',
            ],
            'delivery_type' => 'home_delivery',
        ]);
        $requestA->headers->set('Idempotency-Key', 'checkout-123');
        $requestA->setUserResolver(fn () => $user);

        $first = (new IdempotencyMiddleware())->handle($requestA, fn ($req) => response()->json([
            'success' => true,
            'message' => 'created',
        ], 201));

        $this->assertSame(201, $first->getStatusCode());
        $this->assertNull($first->headers->get('X-Cache-Lookup', null));

        $requestB = Request::create(self::CHECKOUT_PATH, 'POST', [
            'items' => [[
                'variant_id' => 'variant-1',
                'quantity' => 1,
            ]],
            'shipping_address' => [
                'full_name' => 'Jane Doe',
                'phone' => '0712345678',
                'county' => 'Nairobi',
                'town' => 'Westlands',
                'street_address' => 'Sample Road 1',
            ],
            'delivery_type' => 'home_delivery',
        ]);
        $requestB->headers->set('Idempotency-Key', 'checkout-123');
        $requestB->setUserResolver(fn () => $user);

        $replay = (new IdempotencyMiddleware())->handle($requestB, fn ($req) => response()->json([
            'success' => true,
            'message' => 'should not run',
        ], 201));

        $this->assertSame(201, $replay->getStatusCode());
        $this->assertSame('IDEMPOTENT_REPLAY', $replay->headers->get('X-Cache-Lookup', null));
        $this->assertSame('created', $replay->getData(true)['message']);

        $requestC = Request::create(self::CHECKOUT_PATH, 'POST', [
            'items' => [[
                'variant_id' => 'variant-9',
                'quantity' => 2,
            ]],
            'shipping_address' => [
                'full_name' => 'Jane Doe',
                'phone' => '0712345678',
                'county' => 'Nairobi',
                'town' => 'Westlands',
                'street_address' => 'Other Road 2',
            ],
            'delivery_type' => 'home_delivery',
        ]);
        $requestC->headers->set('Idempotency-Key', 'checkout-123');
        $requestC->setUserResolver(fn () => $user);

        $reject = (new IdempotencyMiddleware())->handle($requestC, fn ($req) => response()->json([
            'success' => true,
            'message' => 'should not run',
        ], 201));

        $this->assertSame(422, $reject->getStatusCode());
        $this->assertSame('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD', $reject->getData(true)['error']['code']);
    }
}
