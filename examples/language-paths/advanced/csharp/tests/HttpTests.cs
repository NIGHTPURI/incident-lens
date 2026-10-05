using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text.Json;
using Xunit;

public class HttpTests {
    [System.Runtime.InteropServices.DllImport("libc", EntryPoint = "kill", SetLastError = true)]
    private static extern int SendSignal(int pid, int signal);
    [Fact]
    public async Task IntroServerUsesMemoryAndHonorsHttpContract() {
        var assembly = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../../csharp/bin/Debug/net8.0/CatalogPractice.dll"));
        Assert.True(File.Exists(assembly), "Build examples/language-paths/csharp first");
        var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port; listener.Stop();
        var info = new ProcessStartInfo("dotnet") { RedirectStandardOutput = true, RedirectStandardError = true };
        info.ArgumentList.Add(assembly); info.Environment["PORT"] = port.ToString();
        using var server = Process.Start(info)!;
        var output = server.StandardOutput.ReadToEndAsync(); var errors = server.StandardError.ReadToEndAsync();
        using var http = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}"), Timeout = TimeSpan.FromSeconds(3) };
        async Task<HttpResponseMessage> Post(int quantity) {
            using var req = new HttpRequestMessage(HttpMethod.Post, "/orders") { Content = JsonContent.Create(new { productId = 1, quantity }) };
            req.Headers.Add("Idempotency-Key", "intro-1"); return await http.SendAsync(req);
        }
        try {
            for (int i = 0; i < 600; i++) {
                try { if ((await http.GetAsync("/health")).IsSuccessStatusCode) break; } catch (HttpRequestException) { } catch (TaskCanceledException) { }
                if (server.HasExited) throw new Exception(await errors);
                await Task.Delay(100);
            }
            Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/products/1")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await http.GetAsync("/products/9")).StatusCode);
            using var created = await Post(2); Assert.Equal(HttpStatusCode.Created, created.StatusCode);
            var order = await created.Content.ReadFromJsonAsync<JsonElement>(); Assert.Equal(2400, order.GetProperty("total").GetInt32());
            Assert.Equal("accepted", order.GetProperty("status").GetString());
            Assert.Equal(HttpStatusCode.OK, (await Post(2)).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await Post(3)).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await Post(0)).StatusCode);
        } finally {
            if (!server.HasExited) server.Kill(true);
            await server.WaitForExitAsync(); await output; await errors;
        }
    }
    [Fact]
    public async Task HttpOwnerReplayRestartAndWorkerCorrelation() {
        var dir = Path.Combine(Path.GetTempPath(), $"practice-http-{Guid.NewGuid()}");
        Directory.CreateDirectory(dir);
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start(); var port = ((IPEndPoint)listener.LocalEndpoint).Port; listener.Stop();
        var alice = Guid.NewGuid().ToString("N"); var bob = Guid.NewGuid().ToString("N");
        Process Start(string mode) {
            var info = new ProcessStartInfo("dotnet") { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false };
            info.ArgumentList.Add(typeof(Store).Assembly.Location); info.ArgumentList.Add(mode);
            info.Environment["PRACTICE_DB"] = Path.Combine(dir, "practice.db");
            info.Environment["PORT"] = port.ToString();
            info.Environment["PRACTICE_ALICE_TOKEN"] = alice; info.Environment["PRACTICE_BOB_TOKEN"] = bob;
            return Process.Start(info)!;
        }
        async Task Stop(Process process) {
            if (!process.HasExited) {
                if (OperatingSystem.IsLinux()) {
                    Assert.Equal(0, SendSignal(process.Id, 15));
                    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                    try { await process.WaitForExitAsync(timeout.Token); } catch (OperationCanceledException) { process.Kill(true); }
                } else process.Kill(true);
            }
            await process.WaitForExitAsync();
        }
        using var http = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}"), Timeout = TimeSpan.FromSeconds(3) };
        async Task Ready() {
            for (int i = 0; i < 600; i++) {
                try { if ((await http.GetAsync("/health")).IsSuccessStatusCode) return; } catch (HttpRequestException) { } catch (TaskCanceledException) { }
                await Task.Delay(100);
            }
            throw new Exception("practice API did not become ready");
        }
        async Task<HttpResponseMessage> Order(int quantity, string key = "restart-1") {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/orders") { Content = JsonContent.Create(new { productId = 1, quantity }) };
            request.Headers.Add("Authorization", $"Bearer {alice}"); request.Headers.Add("Idempotency-Key", key);
            return await http.SendAsync(request);
        }
        Process? api = null, worker = null;
        try {
            api = Start("serve"); var apiLog = api.StandardOutput.ReadToEndAsync(); var apiError = api.StandardError.ReadToEndAsync(); await Ready();
            Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/products/1")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await http.GetAsync("/products/9")).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync("/orders/1")).StatusCode);
            using var created = await Order(2); Assert.Equal(HttpStatusCode.Created, created.StatusCode);
            var requestId = created.Headers.GetValues("X-Request-Id").Single();
            var body = await created.Content.ReadFromJsonAsync<JsonElement>(); var id = body.GetProperty("id").GetInt64();
            Assert.Equal("accepted", body.GetProperty("status").GetString());
            http.DefaultRequestHeaders.Authorization = new("Bearer", bob);
            Assert.Equal(HttpStatusCode.Forbidden, (await http.GetAsync($"/orders/{id}")).StatusCode);
            http.DefaultRequestHeaders.Authorization = null;
            Assert.Equal(HttpStatusCode.Conflict, (await Order(3)).StatusCode);
            var parallel = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Order(2, "parallel-1")));
            Assert.Equal(1, parallel.Count(r => r.StatusCode == HttpStatusCode.Created));
            Assert.Equal(7, parallel.Count(r => r.StatusCode == HttpStatusCode.OK));
            var parallelIds = await Task.WhenAll(parallel.Select(async r => (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt64()));
            Assert.Single(parallelIds.Distinct());
            foreach (var response in parallel) response.Dispose();
            await Stop(api); Assert.Equal(0, api.ExitCode); await apiLog; await apiError; api.Dispose();
            api = Start("serve"); var restartedLog = api.StandardOutput.ReadToEndAsync(); var restartedError = api.StandardError.ReadToEndAsync(); await Ready();
            using var replay = await Order(2); Assert.Equal(HttpStatusCode.OK, replay.StatusCode);
            Assert.Equal(id, (await replay.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt64());
            worker = Start("worker"); var workerLog = worker.StandardOutput.ReadToEndAsync(); var workerError = worker.StandardError.ReadToEndAsync();
            http.DefaultRequestHeaders.Authorization = new("Bearer", alice);
            for (int i = 0; i < 600 && new Store(Path.Combine(dir, "practice.db")).Find(id)!.Order.Status != "fulfilled"; i++) await Task.Delay(100);
            var fulfilled = await http.GetFromJsonAsync<JsonElement>($"/orders/{id}"); Assert.Equal("fulfilled", fulfilled.GetProperty("status").GetString());
            for (int i = 0; i < 600 && new Store(Path.Combine(dir, "practice.db")).Pending() != 0; i++) await Task.Delay(100);
            Assert.Equal(0, new Store(Path.Combine(dir, "practice.db")).Pending());
            await Stop(worker); Assert.Equal(0, worker.ExitCode);
            var log = await workerLog; await workerError;
            Assert.Contains(requestId, log); Assert.Contains($"\"orderId\":{id}", log); Assert.DoesNotContain(alice, log);
            worker.Dispose(); worker = Start("worker");
            var ready = await worker.StandardOutput.ReadLineAsync().WaitAsync(TimeSpan.FromSeconds(60));
            Assert.Contains("worker_ready", ready);
            var replayLog = worker.StandardOutput.ReadToEndAsync(); var replayError = worker.StandardError.ReadToEndAsync();
            await Task.Delay(1200); await Stop(worker); Assert.Equal(0, worker.ExitCode);
            Assert.DoesNotContain("local_outbox_processed", await replayLog); await replayError;
            await Stop(api); await restartedLog; await restartedError;
            Assert.False(new Store(Path.Combine(dir, "practice.db")).ProcessOne());
        } finally {
            if (worker != null) { await Stop(worker); worker.Dispose(); }
            if (api != null) { await Stop(api); api.Dispose(); }
            Directory.Delete(dir, true);
        }
    }
}
