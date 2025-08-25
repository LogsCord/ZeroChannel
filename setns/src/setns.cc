#include <napi.h>
#include <sched.h>
#include <errno.h>
#include <string.h>

namespace zc_setns {

    using namespace Napi;

    // Fonction setns sécurisée
    Value SetNS(const CallbackInfo& info) {
        Env env = info.Env();

        // Vérifier le nombre d'arguments
        if (info.Length() != 2) {
            TypeError::New(env, "Wrong number of arguments")
                .ThrowAsJavaScriptException();
            return env.Null();
        }

        // Vérifier les types des arguments
        if (!info[0].IsNumber() || !info[1].IsString()) {
            TypeError::New(env, "Wrong arguments")
                .ThrowAsJavaScriptException();
            return env.Null();
        }

        // Récupérer les arguments
        int fd = info[0].As<Number>().Int32Value();
        std::string nstype = info[1].As<String>().Utf8Value();

        // Convertir le type de namespace en flag
        int nstype_int = 0;
        if (nstype == "net") {
            nstype_int = CLONE_NEWNET;
        } else if (nstype == "pid") {
            nstype_int = CLONE_NEWPID;
        } else if (nstype == "mnt") {
            nstype_int = CLONE_NEWNS;
        } else if (nstype == "ipc") {
            nstype_int = CLONE_NEWIPC;
        } else if (nstype == "uts") {
            nstype_int = CLONE_NEWUTS;
        } else if (nstype == "user") {
            nstype_int = CLONE_NEWUSER;
        } else {
            TypeError::New(env, "Invalid namespace type")
                .ThrowAsJavaScriptException();
            return env.Null();
        }

        // Appel système setns
        int result = setns(fd, nstype_int);
        if (result == -1) {
            char error[256];
            snprintf(error, sizeof(error), "setns failed: %s", strerror(errno));
            Error::New(env, error).ThrowAsJavaScriptException();
            return env.Null();
        }

        return Number::New(env, result);
    }

    // Initialisation du module
    Object Init(Env env, Object exports) {
        exports.Set(String::New(env, "setns"), Function::New(env, SetNS));
        return exports;
    }

    NODE_API_MODULE(zc_setns, Init)
}
