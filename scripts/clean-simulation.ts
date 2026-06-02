import fs from "fs";
import path from "path";

function cleanBookingScreen() {
  const filePath = path.join(process.cwd(), "src/components/client/BookingScreen.tsx");
  if (!fs.existsSync(filePath)) {
    console.log("BookingScreen.tsx not found");
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");

  // Regex to remove the entire <button ...>Simular Pagamento</button> block
  // This handles variable indentation and line endings (\r?\n)
  const buttonRegex = /<button[\s\S]*?setPaymentSuccess\(true\)[\s\S]*?>[\s\S]*?Simular Pagamento[\s\S]*?<\/button>/g;
  
  if (buttonRegex.test(content)) {
    content = content.replace(buttonRegex, "");
    console.log("Successfully removed 'Simular Pagamento' button from BookingScreen.tsx");
  } else {
    console.log("'Simular Pagamento' button not found in BookingScreen.tsx");
  }

  fs.writeFileSync(filePath, content, "utf8");
}

function cleanClientDashboardScreen() {
  const filePath = path.join(process.cwd(), "src/components/client/ClientDashboardScreen.tsx");
  if (!fs.existsSync(filePath)) {
    console.log("ClientDashboardScreen.tsx not found");
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");

  // 1. Replace the rechargeError message at line 169
  const oldErrorMsg = "Não foi possível conectar ao Mercado Pago. Mas sinta-se à vontade para simular a conclusão do pagamento abaixo!";
  const newErrorMsg = "Não foi possível conectar ao Mercado Pago. Verifique sua conexão e tente novamente.";
  content = content.replace(oldErrorMsg, newErrorMsg);

  // 2. Remove the entire rechargeError condition block containing the local Sandbox warning and simulation button:
  // From rechargeError ? ( ... ) : rechargeMpData ...
  // Let's trace lines 1281-1303:
  // we want to replace the rechargeError block so that it only renders the "Tentar Conexão Novamente" button, without the Sandbox UI or "SIMULAR RECEBIMENTO PIX" button.
  // Original structure:
  // : rechargeError ? (
  //    <div className="py-4 space-y-4 w-full text-center">
  //       <div className="..." >...</div>
  //       <button onClick={handleCompleteRechargeSimulation} ...>Simular...</button>
  //       <button onClick={() => handleGenerateRechargePix(...)} ...>Tentar Conexão Novamente</button>
  //    </div>
  // ) : rechargeMpData ...
  
  const errorPanelRegex = /rechargeError\s*\?\s*\([\s\S]*?<div[\s\S]*?Simulador de Sandbox Local[\s\S]*?<\/div>[\s\S]*?handleCompleteRechargeSimulation[\s\S]*?<\/button>([\s\S]*?handleGenerateRechargePix[\s\S]*?Tentar Conexão Novamente[\s\S]*?<\/button>)[\s\S]*?<\/div>\s*\)/g;
  
  if (errorPanelRegex.test(content)) {
    // Keep only the "Tentar Conexão Novamente" button inside the error block, with a clean visual wrapper.
    content = content.replace(errorPanelRegex, `rechargeError ? (
                    <div className="py-4 space-y-4 w-full text-center">
                       <div className="bg-[#1A1110] border border-red-900/40 p-4 rounded-2xl text-left space-y-1">
                          <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block leading-none">Erro de Conexão</span>
                          <p className="text-[10px] text-neutral-400 font-semibold uppercase leading-snug">
                             Incapaz de gerar Pix de recarga neste momento. Verifique seus dados e tente novamente.
                          </p>
                       </div>
                       $1
                    </div>
                 )`);
    console.log("Successfully removed recharge simulation panel and button from ClientDashboardScreen.tsx");
  } else {
    console.log("Recharge simulation panel not found in ClientDashboardScreen.tsx");
  }

  // 3. Remove the Sandbox button "CONFIRMAR PAGAMENTO AGORA (SIMULAR)" under the QR code
  // Under rechargeMpData?.qr_code_base64 && rechargeMpData?.qr_code
  // Lines 1331-1337:
  const confirmSimulationRegex = /\{\/\* Sandbox button for ultimate developer experience \*\/\}[\s\S]*?<button[\s\S]*?handleCompleteRechargeSimulation[\s\S]*?>[\s\S]*?CONFIRMAR PAGAMENTO AGORA \(SIMULAR\)[\s\S]*?<\/button>/g;

  if (confirmSimulationRegex.test(content)) {
    content = content.replace(confirmSimulationRegex, "");
    console.log("Successfully removed raw simulation confirmation button from ClientDashboardScreen.tsx");
  } else {
    // Let's also do a fallback search if comment was slightly different
    const confirmSimulationRegexFallback = /<button[\s\S]*?handleCompleteRechargeSimulation[\s\S]*?>[\s\S]*?CONFIRMAR PAGAMENTO AGORA \(SIMULAR\)[\s\S]*?<\/button>/g;
    if (confirmSimulationRegexFallback.test(content)) {
      content = content.replace(confirmSimulationRegexFallback, "");
      console.log("Successfully removed fallback simulation confirmation button from ClientDashboardScreen.tsx");
    } else {
      console.log("Simulation confirmation button not found in ClientDashboardScreen.tsx");
    }
  }

  fs.writeFileSync(filePath, content, "utf8");
}

function cleanServer() {
  const filePath = path.join(process.cwd(), "server.ts");
  if (!fs.existsSync(filePath)) {
    console.log("server.ts not found");
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");

  // In server.ts, let's update create-payment block:
  // Let's replace the missing-token sandbox payload with a real error throw!
  /*
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    console.log(`[Mercado Pago] ACCESS_TOKEN exists: ${!!accessToken}`);
      if (!accessToken || accessToken.trim() === "") {
        console.warn("[Mercado Pago] ACCESS_TOKEN not configured. Returning simulated payment payload.");
        ...
        return res.json(paymentPayload);
      }
  */
  
  const tokenCheckRegex = /const accessToken = process\.env\.MERCADO_PAGO_ACCESS_TOKEN;[\s\S]*?console\.log\(`\[Mercado Pago\] ACCESS_TOKEN exists: \${!!accessToken}`\);[\s\S]*?if \(!accessToken \|\| accessToken\.trim\(\) === ""\) \{[\s\S]*?return res\.json\(paymentPayload\);[\s\S]*?\}/g;

  if (tokenCheckRegex.test(content)) {
    content = content.replace(tokenCheckRegex, `const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    console.log(\`[Mercado Pago] ACCESS_TOKEN exists: \${!!accessToken}\`);
    if (!accessToken || accessToken.trim() === "") {
      console.warn("[Mercado Pago] ACCESS_TOKEN is missing or not configured.");
      return res.status(400).json({ error: "O Token de Acesso do Mercado Pago não está configurado. Por favor, configure a chave de API MERCADO_PAGO_ACCESS_TOKEN." });
    }`);
    console.log("Successfully removed token-missing mock fallback in server.ts");
  } else {
    console.log("Token-missing mock fallback check not found or already changed in server.ts");
  }

  // Also replace the catch block fallback in server.ts
  /*
    } catch (error: any) {
      console.error("[Mercado Pago Route Error]:", error.response?.data || error.message);
      // Return a professional fallback simulation database-backed so that user testing works
      ...
      res.json({
        ...
      });
    }
  */
  const catchBlockRegex = /\} catch \(error: any\) \{[\s\S]*?console\.error\(\"\[Mercado Pago Route Error\]:\",[\s\S]*?fallbackPaymentId[\s\S]*?res\.json\(\{[\s\S]*?\}\);[\s\S]*?\}/g;

  if (catchBlockRegex.test(content)) {
    content = content.replace(catchBlockRegex, `} catch (error: any) {
      console.error("[Mercado Pago Route Error]:", error.response?.data || error.message);
      const errMsg = error.response?.data?.message || error.message || "Erro de Integração com o Mercado Pago";
      return res.status(500).json({ error: errMsg });
    }`);
    console.log("Successfully removed catch-block mock fallback in server.ts");
  } else {
    console.log("Catch-block mock fallback not found in server.ts");
  }

  // Also disable the simulate-payment endpoint
  /*
  app.post("/api/payments/mercado-pago/simulate-payment", async (req, res) => {
    ...
  });
  */
  const simulateEndpointRegex = /app\.post\("\/api\/payments\/mercado-pago\/simulate-payment"[\s\S]*?\}\);/g;
  if (simulateEndpointRegex.test(content)) {
    content = content.replace(simulateEndpointRegex, `app.post("/api/payments/mercado-pago/simulate-payment", (req, res) => {
    return res.status(400).json({ error: "Simulação desativada. O sistema está configurado para pagamentos 100% reais em produção." });
  });`);
    console.log("Successfully disabled simulate-payment endpoint in server.ts");
  } else {
    console.log("simulate-payment endpoint not found in server.ts");
  }

  fs.writeFileSync(filePath, content, "utf8");
}

console.log("Starting simulation cleanup...");
cleanBookingScreen();
cleanClientDashboardScreen();
cleanServer();
console.log("Simulation cleanup complete!");
